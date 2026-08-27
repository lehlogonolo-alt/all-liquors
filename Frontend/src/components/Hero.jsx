import { useEffect, useState } from "react";

const heroSlides = [
  {
    image: "/images/all-liqours-shopbackground.jpeg",
    tag: "Phake • Gauteng",
    title: "Shop Online. Collect In Store.",
    text: "Browse our products, check availability and pay securely online. Your order will be ready for collection at All Liquors.",
    button: "Browse Products",
    link: "/shop"
  },
  {
    image: "/images/all-liquors-resort-background.jpeg",
    tag: "For Every Occasion",
    title: "Make Every Celebration Special",
    text: "From intimate gatherings to unforgettable celebrations, find the products you need for your next occasion.",
    button: "Resort",
    link: "/elephant-resort"
  },
  {
    image: "/images/allliquor-event3.jpeg",
    tag: "Celebrate Together",
    title: "Good Moments Start Here",
    text: "Bring people together with a quality selection for birthdays, parties, celebrations and special occasions.",
    button: "Events",
    link: "/events"
  },
  {
    image: "/images/all-liquors-vip.jpeg",
    tag: "All Liquors Wholesale",
    title: "Your Occasion. Your Selection.",
    text: "Discover our range and find the right products for your next event, gathering or celebration.",
    button: "View Products",
    link: "/shop"
  }
];

function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((current) =>
        (current + 1) % heroSlides.length
      );
    }, 6000);

    return () => clearInterval(timer);
  }, []);

  const slide = heroSlides[currentSlide];

  return (
    <section
      className="hero"
      style={{
        backgroundImage: `url("${slide.image}")`
      }}
    >

      <div className="hero-overlay"></div>

      <div className="hero-content">

        <p className="hero-tag">
          {slide.tag}
        </p>

        <h1>
          {slide.title}
        </h1>

        <p className="hero-description">
          {slide.text}
        </p>

        <div className="hero-actions">

          <button
            className="explore-btn"
            onClick={() => {
              window.location.href = slide.link;
            }}
          >
            {slide.button}
          </button>

        </div>

        <div className="hero-dots">

          {heroSlides.map((_, index) => (
            <button
              key={index}
              className={`hero-dot ${
                currentSlide === index
                  ? "active"
                  : ""
              }`}
              onClick={() => setCurrentSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}

        </div>

      </div>

    </section>
  );
}

export default Hero;