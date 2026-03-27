import ConnectButton from "@/components/shared/ConnectButton";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg-primary">
      <h1 className="text-5xl font-bold text-white tracking-tight">
        Pacifica <span className="text-accent-primary">Colosseum</span>
      </h1>
      <p className="mt-4 text-lg text-gray-400">
        Battle Royale Trading Competition
      </p>
      <div className="mt-8">
        <ConnectButton />
      </div>
    </main>
  );
}
