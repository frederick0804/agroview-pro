import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Leaf, Eye, EyeOff, AlertCircle, CheckCircle, KeyRound, Mail, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useRole } from "@/contexts/RoleContext";

const RECOVERY_STORAGE_KEY = "agroview_recovery";

interface RecoveryData {
  email: string;
  code: string;
  expiry: number;
}

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// OTP Input — 6 cuadros individuales
function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, char: string) => {
    const digit = char.replace(/\D/g, "").slice(-1);
    const arr = value.split("");
    arr[index] = digit;
    const next = arr.join("").padEnd(6, "").slice(0, 6);
    onChange(next);
    if (digit && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (value[index]) {
        const arr = value.split("");
        arr[index] = "";
        onChange(arr.join("").padEnd(6, "").slice(0, 6));
      } else if (index > 0) {
        inputs.current[index - 1]?.focus();
        const arr = value.split("");
        arr[index - 1] = "";
        onChange(arr.join("").padEnd(6, "").slice(0, 6));
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6).padEnd(6, "");
    onChange(pasted);
    inputs.current[Math.min(pasted.replace(/ /g, "").length, 5)]?.focus();
    e.preventDefault();
  };

  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { inputs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] && value[i] !== " " ? value[i] : ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className="w-11 h-14 text-center text-xl font-mono font-bold border-2 rounded-lg bg-background focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all caret-transparent"
        />
      ))}
    </div>
  );
}

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { users, resetPassword } = useRole();

  // step: "email" | "code" | "password" | "success"
  const [step, setStep] = useState<"email" | "code" | "password" | "success">("email");

  // Step 1
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");

  // Step 2
  const [code, setCode] = useState("      ");
  const [codeError, setCodeError] = useState("");

  // Step 3
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passError, setPassError] = useState("");

  /* ── Step 1: solicitar código ── */
  const handleRequestCode = (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError("");
    const user = users.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.activo !== false
    );
    if (!user) {
      setEmailError("No se encontró ninguna cuenta activa con ese correo.");
      return;
    }
    const newCode = generateCode();
    const data: RecoveryData = {
      email: email.trim().toLowerCase(),
      code: newCode,
      expiry: Date.now() + 15 * 60 * 1000,
    };
    localStorage.setItem(RECOVERY_STORAGE_KEY, JSON.stringify(data));
    setGeneratedCode(newCode);
    setCode("      ");
    setStep("code");
  };

  /* ── Step 2: verificar código ── */
  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    setCodeError("");
    const raw = localStorage.getItem(RECOVERY_STORAGE_KEY);
    if (!raw) { setCodeError("El código ha expirado. Solicita uno nuevo."); return; }
    const data: RecoveryData = JSON.parse(raw);
    if (Date.now() > data.expiry) {
      localStorage.removeItem(RECOVERY_STORAGE_KEY);
      setCodeError("El código expiró (15 min). Solicita uno nuevo.");
      return;
    }
    const entered = code.trim();
    if (entered.length < 6 || entered !== data.code) {
      setCodeError("Código incorrecto. Verifica e intenta nuevamente.");
      return;
    }
    setStep("password");
  };

  /* ── Step 3: nueva contraseña ── */
  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPassError("");
    if (newPassword.length < 6) { setPassError("La contraseña debe tener al menos 6 caracteres."); return; }
    if (newPassword !== confirmPassword) { setPassError("Las contraseñas no coinciden."); return; }
    const raw = localStorage.getItem(RECOVERY_STORAGE_KEY);
    if (!raw) { setPassError("Sesión expirada. Vuelve a iniciar el proceso."); return; }
    const data: RecoveryData = JSON.parse(raw);
    const ok = resetPassword(data.email, newPassword);
    if (!ok) { setPassError("No se pudo actualizar la contraseña. Intenta de nuevo."); return; }
    localStorage.removeItem(RECOVERY_STORAGE_KEY);
    setStep("success");
  };

  const stepTitle: Record<typeof step, string> = {
    email: "Recuperar contraseña",
    code: "Verificación",
    password: "Nueva contraseña",
    success: "¡Contraseña actualizada!",
  };
  const stepSubtitle: Record<typeof step, string> = {
    email: "Ingresa tu correo para recibir un código de verificación.",
    code: "Ingresa el código de 6 dígitos que generamos para tu cuenta.",
    password: "Establece tu nueva contraseña de acceso.",
    success: "Tu contraseña ha sido cambiada correctamente.",
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
              <Leaf className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Agroworkin</h1>
              <p className="text-sm text-muted-foreground">Sistema de Gestión Agrícola</p>
            </div>
          </div>

          {/* Step indicator */}
          {step !== "success" && (
            <div className="flex items-center gap-2">
              {(["email", "code", "password"] as const).map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                      step === s
                        ? "bg-primary text-primary-foreground"
                        : ["email", "code", "password"].indexOf(step) > i
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {i + 1}
                  </div>
                  {i < 2 && <div className={`flex-1 h-px w-8 ${["email", "code", "password"].indexOf(step) > i ? "bg-primary/40" : "bg-muted"}`} />}
                </div>
              ))}
            </div>
          )}

          {/* Title */}
          <div className="space-y-1">
            <h2 className="text-3xl font-bold text-foreground">{stepTitle[step]}</h2>
            <p className="text-muted-foreground">{stepSubtitle[step]}</p>
          </div>

          {/* Card */}
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">

              {/* STEP 1: Email */}
              {step === "email" && (
                <form onSubmit={handleRequestCode} className="space-y-5">
                  {emailError && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {emailError}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="email">Correo electrónico</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="usuario@agroworkin.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-11 pl-9"
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full h-11 text-base">
                    Enviar código de recuperación
                  </Button>
                </form>
              )}

              {/* STEP 2: OTP Code */}
              {step === "code" && (
                <form onSubmit={handleVerifyCode} className="space-y-6">
                  {/* Demo notice */}
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                    <KeyRound className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Modo demo — tu código es:</p>
                      <p className="text-2xl font-mono font-bold tracking-widest mt-1">{generatedCode}</p>
                      <p className="text-xs mt-1 text-amber-600">Válido por 15 minutos.</p>
                    </div>
                  </div>

                  {codeError && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {codeError}
                    </div>
                  )}

                  <div className="space-y-3">
                    <Label className="text-center block">Código de verificación</Label>
                    <OtpInput value={code} onChange={setCode} />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 text-base"
                    disabled={code.trim().length < 6}
                  >
                    Verificar código
                  </Button>

                  <button
                    type="button"
                    onClick={() => { setStep("email"); setCodeError(""); }}
                    className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Volver a ingresar correo
                  </button>
                </form>
              )}

              {/* STEP 3: New Password */}
              {step === "password" && (
                <form onSubmit={handleResetPassword} className="space-y-5">
                  {passError && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {passError}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Nueva contraseña</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPass ? "text" : "password"}
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="h-11 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPass(!showNewPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showNewPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPass ? "text" : "password"}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="h-11 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPass(!showConfirmPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showConfirmPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full h-11 text-base">
                    Cambiar contraseña
                  </Button>
                </form>
              )}

              {/* STEP 4: Success */}
              {step === "success" && (
                <div className="space-y-5 text-center">
                  <div className="flex justify-center">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle className="w-9 h-9 text-green-600" />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Ya puedes iniciar sesión con tu nueva contraseña.
                  </p>
                  <Button className="w-full h-11 text-base" onClick={() => navigate("/login")}>
                    Ir al inicio de sesión
                  </Button>
                </div>
              )}

            </CardContent>
          </Card>

          {/* Back link */}
          {step !== "success" && (
            <button
              onClick={() => navigate("/login")}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al inicio de sesión
            </button>
          )}
        </div>
      </div>

      {/* Right Panel */}
      <div className="hidden lg:flex flex-1 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-sidebar-background" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full border-2 border-primary-foreground" />
          <div className="absolute bottom-32 right-16 w-48 h-48 rounded-full border-2 border-primary-foreground" />
          <div className="absolute top-1/2 left-1/3 w-32 h-32 rounded-full border-2 border-primary-foreground" />
        </div>
        <div className="relative z-10 flex flex-col justify-center p-12 text-primary-foreground">
          <div className="max-w-md space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center">
              <KeyRound className="w-9 h-9 text-accent-foreground" />
            </div>
            <h2 className="text-4xl font-bold leading-tight">
              Recupera el acceso a tu cuenta
            </h2>
            <p className="text-lg text-primary-foreground/80">
              Sigue los pasos para verificar tu identidad y establecer una nueva contraseña de forma segura.
            </p>
            <ul className="space-y-3 text-primary-foreground/90">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-accent" />
                Ingresa tu correo registrado
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-accent" />
                Verifica tu identidad con el código
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-accent" />
                Establece tu nueva contraseña
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
