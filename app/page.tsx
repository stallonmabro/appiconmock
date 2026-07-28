import { auth } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { ToolCard } from "@/components/landing/tool-card";
import { AdBanner } from "@/components/ads/AdBanner";

export default async function LandingPage() {
  const session = await auth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white">
      <Header session={session} />
      <main className="mx-auto max-w-6xl px-4 pt-24 pb-16">
        <section className="text-center mb-16">
          <h1 className="text-5xl font-bold tracking-tight text-neutral-900 mb-4">
            Free App Icon & Mockup Maker
          </h1>
          <p className="text-xl text-neutral-600 max-w-2xl mx-auto">
            Create professional app icons for iOS and Android. Generate stunning device mockups.
            No design skills needed. Start free.
          </p>
        </section>

        <section className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <ToolCard
            title="App Icon Maker"
            description="Design icons from templates or scratch. AI-powered generation. Export all iOS + Android sizes in one click."
            href="/icon-maker"
            icon="🎨"
            cta="Create Icon"
          />
          <ToolCard
            title="App Mockup Maker"
            description="Wrap screenshots in device frames. Real-world scenes. Multi-screen layouts for App Store screenshots."
            href="/mockup-maker"
            icon="📱"
            cta="Create Mockup"
          />
        </section>

        <AdBanner placement="landing" className="mt-16 max-w-4xl mx-auto" />
      </main>
    </div>
  );
}
