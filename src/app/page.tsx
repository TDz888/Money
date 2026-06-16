import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function HomePage() {
  const me = await getCurrentUser();
  if (me) redirect("/chat");
  return (
    <main className="relative min-h-screen flex items-center justify-center px-6">
      <div className="relative z-10 max-w-4xl w-full text-center">
        <div className="inline-flex items-center gap-2 mb-8 px-4 py-1.5 rounded-pill border border-emerald-success/30 bg-emerald-success/10">
          <span className="w-2 h-2 rounded-full bg-emerald-success animate-pulse" />
          <span className="text-xs font-semibold text-emerald-soft">BETA · v1.0</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-black leading-[1.1] tracking-tight mb-6">
          <span className="text-text-primary">Chat with </span>
          <span className="bg-gradient-to-r from-electric-purple via-purple-glow to-sky-blue bg-clip-text text-transparent">
            any AI
          </span>
          <br />
          <span className="text-text-primary">in one secure place.</span>
        </h1>
        <p className="text-body-compact text-text-secondary max-w-2xl mx-auto mb-12">
          GPT-4o, Claude 3.5, Gemini 1.5, Groq — all in a single, blazing fast
          interface. Earn credits by completing a quick task. No card required.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/register"
            className="px-7 py-3.5 rounded-standard bg-electric-purple text-white font-semibold text-base shadow-level-2 hover:bg-electric-purple-hover hover:shadow-level-3 transition-all"
          >
            Get started
          </Link>
          <Link
            href="/login"
            className="px-7 py-3.5 rounded-standard border border-border-light text-text-primary font-semibold text-base hover:border-border-strong hover:bg-surface-glass-hover transition-all"
          >
            I have an account
          </Link>
        </div>

        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          {[
            { title: "Multi-model", desc: "OpenAI, Anthropic, Google, Groq. Switch mid-conversation." },
            { title: "Token-based", desc: "Earn credits via Yeumoney. No subscriptions, no surprises." },
            { title: "Zero-trust", desc: "Signed webhooks, server-side credits, edge rate-limits." }
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-generous border border-border-light bg-surface-glass p-8 hover:border-border-strong hover:shadow-level-1 transition-all"
            >
              <h3 className="text-h2 font-bold text-text-primary mb-2">{f.title}</h3>
              <p className="text-body-small text-text-secondary">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
