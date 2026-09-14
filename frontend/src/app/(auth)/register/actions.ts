"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type RegisterState = { error: string | null; confirmEmailSent?: boolean };

export async function signUp(_prevState: RegisterState, formData: FormData): Promise<RegisterState> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");
  const isInstructor = formData.get("is_instructor") === "on";

  if (!fullName || !email || !password) {
    return { error: "Fill in your name, email, and password." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const role = isInstructor ? "unverified_instructor" : "student";

  const supabase = await createClient();

  const emailDomain = email.split("@")[1]?.toLowerCase();
  if (!emailDomain) {
    return { error: "Enter a valid email address." };
  }

  const { data: isAllowlisted, error: domainCheckError } = await supabase.rpc("is_domain_allowlisted", {
    p_domain: emailDomain,
  });

  if (domainCheckError) {
    return { error: "We couldn't verify your institution right now. Please try again shortly." };
  }

  if (!isAllowlisted) {
    return {
      error: "Your institution hasn't been onboarded to BalootBooks yet. Contact your administrator for access.",
    };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, role },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (!data.session) {
    return { error: null, confirmEmailSent: true };
  }

  redirect(isInstructor ? "/onboarding/instructor-verification" : "/dashboard");
}
