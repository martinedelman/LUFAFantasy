interface FixedHeroSectionProps {
  image: string;
  ariaLabel: string;
  className?: string;
  backgroundPosition?: string;
  mobileBackgroundPosition?: string;
  children?: React.ReactNode;
}

export default function FixedHeroSection({
  image,
  ariaLabel,
  className,
  backgroundPosition = "center center",
  mobileBackgroundPosition,
  children,
}: FixedHeroSectionProps) {
  return (
    <section
      className={`hero-fixed-section ${className || ""}`}
      aria-label={ariaLabel}
      style={
        {
          "--hero-background-image": `linear-gradient(to bottom, rgba(10, 10, 10, 0.46), rgba(10, 10, 10, 0.46)), url(${image})`,
          "--hero-background-position": backgroundPosition,
          "--hero-background-position-mobile": mobileBackgroundPosition || backgroundPosition,
        } as React.CSSProperties
      }
    >
      <div className="hero-fixed-section__bg" aria-hidden="true" />
      {children ? <div className="hero-fixed-section__content">{children}</div> : null}
    </section>
  );
}
