use serde::{Deserialize, Serialize};
use std::sync::{
    atomic::{AtomicU64, Ordering},
    Arc,
};
use tauri::{ipc::Channel, State};

#[derive(Default)]
pub struct NativeCaptureState {
    generation: Arc<AtomicU64>,
}

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CaptureSourceRequest {
    id: u32,
    kind: CaptureSourceKind,
}

#[derive(Clone, Copy, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum CaptureSourceKind {
    Monitor,
    Window,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CaptureSource {
    id: u32,
    kind: CaptureSourceKind,
    title: String,
    subtitle: String,
    width: u32,
    height: u32,
    is_primary: bool,
}

#[derive(Clone, Serialize)]
#[serde(
    rename_all = "camelCase",
    rename_all_fields = "camelCase",
    tag = "event",
    content = "data"
)]
pub enum CaptureEvent {
    Frame {
        jpeg_base64: String,
        width: u32,
        height: u32,
    },
    Error {
        message: String,
    },
    Stopped,
}

#[tauri::command]
pub fn list_native_capture_sources() -> Result<Vec<CaptureSource>, String> {
    list_sources()
}

#[tauri::command]
pub fn native_capture_thumbnail(source: CaptureSourceRequest) -> Result<String, String> {
    capture_thumbnail(source)
}

#[tauri::command]
pub fn start_native_screen_capture(
    source: CaptureSourceRequest,
    on_event: Channel<CaptureEvent>,
    state: State<'_, NativeCaptureState>,
) -> Result<(), String> {
    let generation = state.generation.fetch_add(1, Ordering::SeqCst) + 1;
    let generation_state = Arc::clone(&state.generation);
    start_capture(source, generation, generation_state, on_event)
}

#[tauri::command]
pub fn stop_native_screen_capture(state: State<'_, NativeCaptureState>) {
    state.generation.fetch_add(1, Ordering::SeqCst);
}

#[cfg(not(target_os = "windows"))]
fn list_sources() -> Result<Vec<CaptureSource>, String> {
    Err("A captura nativa está disponível somente no aplicativo para Windows.".to_string())
}

#[cfg(not(target_os = "windows"))]
fn capture_thumbnail(_source: CaptureSourceRequest) -> Result<String, String> {
    Err("A captura nativa está disponível somente no aplicativo para Windows.".to_string())
}

#[cfg(not(target_os = "windows"))]
fn start_capture(
    _source: CaptureSourceRequest,
    _generation: u64,
    _generation_state: Arc<AtomicU64>,
    _on_event: Channel<CaptureEvent>,
) -> Result<(), String> {
    Err("A captura nativa está disponível somente no aplicativo para Windows.".to_string())
}

#[cfg(target_os = "windows")]
fn list_sources() -> Result<Vec<CaptureSource>, String> {
    use xcap::{Monitor, Window};

    let mut sources = Vec::new();

    for monitor in Monitor::all().map_err(capture_error)? {
        sources.push(CaptureSource {
            id: monitor.id().map_err(capture_error)?,
            kind: CaptureSourceKind::Monitor,
            title: if monitor.is_primary().unwrap_or(false) {
                "Tela principal".to_string()
            } else {
                monitor
                    .friendly_name()
                    .unwrap_or_else(|_| "Outra tela".to_string())
            },
            subtitle: monitor
                .friendly_name()
                .or_else(|_| monitor.name())
                .unwrap_or_else(|_| "Monitor do Windows".to_string()),
            width: monitor.width().unwrap_or_default(),
            height: monitor.height().unwrap_or_default(),
            is_primary: monitor.is_primary().unwrap_or(false),
        });
    }

    for window in Window::all().map_err(capture_error)? {
        let title = window.title().unwrap_or_default().trim().to_string();
        let width = window.width().unwrap_or_default();
        let height = window.height().unwrap_or_default();

        if title.is_empty()
            || title == "Crypt"
            || window.is_minimized().unwrap_or(true)
            || width < 240
            || height < 160
        {
            continue;
        }

        sources.push(CaptureSource {
            id: window.id().map_err(capture_error)?,
            kind: CaptureSourceKind::Window,
            title,
            subtitle: window
                .app_name()
                .unwrap_or_else(|_| "Janela do Windows".to_string()),
            width,
            height,
            is_primary: false,
        });

        if sources
            .iter()
            .filter(|source| matches!(source.kind, CaptureSourceKind::Window))
            .count()
            >= 24
        {
            break;
        }
    }

    Ok(sources)
}

#[cfg(target_os = "windows")]
fn capture_thumbnail(source: CaptureSourceRequest) -> Result<String, String> {
    use base64::Engine;

    let image = capture_source_image(&source)?;
    let encoded = encode_jpeg(image, 480, 270, 62)?;
    Ok(format!(
        "data:image/jpeg;base64,{}",
        base64::engine::general_purpose::STANDARD.encode(encoded.bytes)
    ))
}

#[cfg(target_os = "windows")]
fn start_capture(
    source: CaptureSourceRequest,
    generation: u64,
    generation_state: Arc<AtomicU64>,
    on_event: Channel<CaptureEvent>,
) -> Result<(), String> {
    use std::thread;

    thread::Builder::new()
        .name("crypt-native-capture".to_string())
        .spawn(move || {
            let result = match source.kind {
                CaptureSourceKind::Monitor => {
                    run_monitor_capture(source.id, generation, &generation_state, &on_event)
                }
                CaptureSourceKind::Window => {
                    run_window_capture(source.id, generation, &generation_state, &on_event)
                }
            };

            if let Err(message) = result {
                let _ = on_event.send(CaptureEvent::Error { message });
            }
            let _ = on_event.send(CaptureEvent::Stopped);
        })
        .map_err(|error| format!("Não foi possível iniciar a captura nativa: {error}"))?;

    Ok(())
}

#[cfg(target_os = "windows")]
fn run_monitor_capture(
    monitor_id: u32,
    generation: u64,
    generation_state: &Arc<AtomicU64>,
    on_event: &Channel<CaptureEvent>,
) -> Result<(), String> {
    use std::{
        sync::mpsc::RecvTimeoutError,
        time::{Duration, Instant},
    };
    use xcap::Monitor;

    let monitor = Monitor::all()
        .map_err(capture_error)?
        .into_iter()
        .find(|candidate| candidate.id().ok() == Some(monitor_id))
        .ok_or_else(|| "A tela escolhida não está mais disponível.".to_string())?;
    let (recorder, frames) = monitor.video_recorder().map_err(capture_error)?;
    recorder.start().map_err(capture_error)?;

    let frame_interval = Duration::from_millis(66);
    let mut last_frame_at = Instant::now() - frame_interval;
    let result = loop {
        if generation_state.load(Ordering::SeqCst) != generation {
            break Ok(());
        }

        match frames.recv_timeout(Duration::from_millis(150)) {
            Ok(frame) => {
                if last_frame_at.elapsed() < frame_interval {
                    continue;
                }

                let image = image::RgbaImage::from_raw(frame.width, frame.height, frame.raw)
                    .ok_or_else(|| {
                        "O Windows entregou um quadro inválido para a transmissão.".to_string()
                    })?;
                send_frame(image, on_event)?;
                last_frame_at = Instant::now();
            }
            Err(RecvTimeoutError::Timeout) => continue,
            Err(RecvTimeoutError::Disconnected) => {
                break Err("O Windows interrompeu a captura da tela.".to_string());
            }
        }
    };

    let _ = recorder.stop();
    result
}

#[cfg(target_os = "windows")]
fn run_window_capture(
    window_id: u32,
    generation: u64,
    generation_state: &Arc<AtomicU64>,
    on_event: &Channel<CaptureEvent>,
) -> Result<(), String> {
    use std::{
        thread,
        time::{Duration, Instant},
    };
    use xcap::Window;

    let window = Window::all()
        .map_err(capture_error)?
        .into_iter()
        .find(|candidate| candidate.id().ok() == Some(window_id))
        .ok_or_else(|| "A janela escolhida não está mais disponível.".to_string())?;
    let frame_interval = Duration::from_millis(66);
    let mut next_frame_at = Instant::now();

    while generation_state.load(Ordering::SeqCst) == generation {
        if window.is_minimized().unwrap_or(true) {
            return Err("Restaure a janela para continuar transmitindo.".to_string());
        }

        send_frame(window.capture_image().map_err(capture_error)?, on_event)?;

        next_frame_at += frame_interval;
        let now = Instant::now();
        if next_frame_at > now {
            thread::sleep(next_frame_at - now);
        } else {
            next_frame_at = now;
        }
    }

    Ok(())
}

#[cfg(target_os = "windows")]
fn send_frame(
    image: image::RgbaImage,
    on_event: &Channel<CaptureEvent>,
) -> Result<(), String> {
    use base64::Engine;

    let encoded = encode_jpeg(image, 1440, 810, 68)?;
    on_event
        .send(CaptureEvent::Frame {
            jpeg_base64: base64::engine::general_purpose::STANDARD.encode(encoded.bytes),
            width: encoded.width,
            height: encoded.height,
        })
        .map_err(|_| "A interface do Crypt encerrou a transmissão.".to_string())
}

#[cfg(target_os = "windows")]
fn capture_source_image(source: &CaptureSourceRequest) -> Result<image::RgbaImage, String> {
    use xcap::{Monitor, Window};

    match source.kind {
        CaptureSourceKind::Monitor => Monitor::all()
            .map_err(capture_error)?
            .into_iter()
            .find(|monitor| monitor.id().ok() == Some(source.id))
            .ok_or_else(|| "A tela escolhida não está mais disponível.".to_string())?
            .capture_image()
            .map_err(capture_error),
        CaptureSourceKind::Window => Window::all()
            .map_err(capture_error)?
            .into_iter()
            .find(|window| window.id().ok() == Some(source.id))
            .ok_or_else(|| "A janela escolhida não está mais disponível.".to_string())?
            .capture_image()
            .map_err(capture_error),
    }
}

#[cfg(target_os = "windows")]
fn encode_jpeg(
    image: image::RgbaImage,
    max_width: u32,
    max_height: u32,
    quality: u8,
) -> Result<EncodedJpeg, String> {
    use image::{codecs::jpeg::JpegEncoder, imageops::FilterType, DynamicImage};

    let resized = DynamicImage::ImageRgba8(image)
        .resize(max_width, max_height, FilterType::Triangle)
        .to_rgb8();
    let (width, height) = resized.dimensions();
    let mut encoded = Vec::new();

    JpegEncoder::new_with_quality(&mut encoded, quality)
        .encode(
            resized.as_raw(),
            width,
            height,
            image::ExtendedColorType::Rgb8,
        )
        .map_err(|error| format!("Não foi possível preparar o quadro da transmissão: {error}"))?;

    Ok(EncodedJpeg {
        bytes: encoded,
        height,
        width,
    })
}

#[cfg(target_os = "windows")]
struct EncodedJpeg {
    bytes: Vec<u8>,
    height: u32,
    width: u32,
}

#[cfg(target_os = "windows")]
fn capture_error(error: impl std::fmt::Display) -> String {
    format!("A captura nativa do Windows falhou: {error}")
}
