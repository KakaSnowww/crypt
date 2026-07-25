type AuthPageHeaderProps = {
  description: string;
  eyebrow: string;
  id: string;
  title: string;
};

export function AuthPageHeader({ description, eyebrow, id, title }: AuthPageHeaderProps) {
  return (
    <>
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-white" id={id}>
        {title}
      </h1>
      <p className="mt-3 text-sm leading-6 text-crypt-muted">{description}</p>
    </>
  );
}
