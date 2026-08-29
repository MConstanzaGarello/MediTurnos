import RegisterForm from "@/components/patient/RegisterForm";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white">MediTurnos</h1>
          <p className="text-slate-400 mt-2">Gestión de turnos médicos</p>
        </div>

        <RegisterForm />
      </div>
    </main>
  );
}
