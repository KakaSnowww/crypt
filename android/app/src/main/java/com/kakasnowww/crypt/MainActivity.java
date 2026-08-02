package com.kakasnowww.crypt;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(CryptCallPlugin.class);
        registerPlugin(CryptUpdaterPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
