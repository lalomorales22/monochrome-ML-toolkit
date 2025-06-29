import SynapseTerminal from '@/components/synapse-terminal';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 md:p-12 font-code">
      <div className="w-full max-w-7xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tighter">
            Monochrome ML Toolkit
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            An advanced ML toolkit, reimagined for the web.
          </p>
        </header>
        <SynapseTerminal />
      </div>
    </main>
  );
}
