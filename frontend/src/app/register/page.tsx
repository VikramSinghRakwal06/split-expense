"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Phone, User, Mail, Lock, Receipt } from "lucide-react";
import { applyValidationErrors, login, register as registerAccount } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { IconInput } from "@/components/icon-input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Mirrors auth-service's RegisterRequest bean validation exactly (see
// auth-service/.../dto/request/RegisterRequest.java) so the user sees the
// same rule client-side before ever hitting the network.
const phoneRegex = /^\+?[1-9]\d{7,14}$/;

const registerSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .max(255, "Email must not exceed 255 characters")
    .email("Email must be a well-formed address"),
  password: z
    .string()
    .min(8, "Password must be between 8 and 72 characters")
    .max(72, "Password must be between 8 and 72 characters")
    .regex(
      /^(?=.*[A-Za-z])(?=.*\d).+$/,
      "Password must contain at least one letter and one digit",
    ),
  fullName: z
    .string()
    .min(1, "Full name is required")
    .max(150, "Full name must not exceed 150 characters"),
  phoneNumber: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() !== "" ? v.trim() : undefined))
    .refine((v) => v === undefined || phoneRegex.test(v), {
      message: "Phone number must be 8 to 15 digits, optionally prefixed with +",
    }),
});

type RegisterFormInput = z.input<typeof registerSchema>;
type RegisterFormValues = z.output<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register: formRegister,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterFormInput, unknown, RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  async function onSubmit(values: RegisterFormValues) {
    setServerError(null);
    setSubmitting(true);
    try {
      await registerAccount(values);
    } catch (err) {
      const message = applyValidationErrors(err, (field, msg) =>
        setError(field as keyof RegisterFormValues, { message: msg }),
      );
      setServerError(message);
      setSubmitting(false);
      return;
    }

    // Registration alone does not create a session (auth-service's contract)
    // — immediately sign in with the same credentials so a recruiter lands
    // straight on the dashboard instead of a second login screen.
    try {
      await login({ email: values.email, password: values.password });
      router.push("/groups");
      router.refresh();
    } catch {
      router.push("/login");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-secondary/40 p-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
          <Receipt className="size-6" />
        </span>

        <Card className="w-full shadow-xl shadow-black/5">
          <CardHeader>
            <CardTitle className="text-xl">Create your SplitExpense account</CardTitle>
            <CardDescription>Takes under a minute.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
              {serverError && (
                <Alert variant="destructive">
                  <AlertDescription>{serverError}</AlertDescription>
                </Alert>
              )}

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="fullName">Full name</Label>
                <IconInput
                  icon={User}
                  id="fullName"
                  autoComplete="name"
                  aria-invalid={!!errors.fullName}
                  {...formRegister("fullName")}
                />
                {errors.fullName && (
                  <p className="text-sm text-destructive">{errors.fullName.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email</Label>
                <IconInput
                  icon={Mail}
                  id="email"
                  type="email"
                  autoComplete="email"
                  aria-invalid={!!errors.email}
                  {...formRegister("email")}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">Password</Label>
                <IconInput
                  icon={Lock}
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={!!errors.password}
                  {...formRegister("password")}
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  At least 8 characters, with a letter and a digit.
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="phoneNumber">Phone number (optional)</Label>
                <IconInput
                  icon={Phone}
                  id="phoneNumber"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+14155550100"
                  aria-invalid={!!errors.phoneNumber}
                  {...formRegister("phoneNumber")}
                />
                {errors.phoneNumber && (
                  <p className="text-sm text-destructive">{errors.phoneNumber.message}</p>
                )}
              </div>

              <Button type="submit" disabled={submitting} className="mt-2">
                {submitting ? "Creating account…" : "Create account"}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
                  Sign in
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
