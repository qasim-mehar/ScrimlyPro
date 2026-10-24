import BenefitsSection from "@/components/landing/BenefitsSection";
import Hero from "@/components/landing/Hero";
import ReserveSection from "@/components/reserve-section";
import SiteFooter from "@/components/site-footer";

export default function Home() {
  return (
    <>
      <Hero />
      <BenefitsSection />
      <ReserveSection />
      <SiteFooter />
    </>
  );
}
