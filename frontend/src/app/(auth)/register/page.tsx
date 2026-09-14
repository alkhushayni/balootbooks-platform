"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { signUp, type RegisterState } from "./actions";

const initialState: RegisterState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Creating account..." : "Create account"}
    </button>
  );
}

export default function RegisterPage() {
  const [state, formAction] = useActionState(signUp, initialState);
  const [isInstructor, setIsInstructor] = useState(false);

  if (state.confirmEmailSent) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Check your email</h2>
        <p className="mt-3 text-sm text-slate-600">
          We sent a confirmation link to finish setting up your account. Once confirmed, sign in to
          continue.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900">Create your account</h2>
      <p className="mt-1 text-sm text-slate-500">
        Already have one?{" "}
        <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
          Sign in
        </Link>
      </p>

      <form action={formAction} className="mt-8 space-y-5">
        {state.error && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</div>
        )}

        <div>
          <label htmlFor="full_name" className="block text-sm font-medium text-slate-700">
            Full name
          </label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            autoComplete="name"
            required
            className="mt-1.5 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="mt-1.5 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-700">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className="mt-1.5 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div>
          <label htmlFor="confirm_password" className="block text-sm font-medium text-slate-700">
            Confirm password
          </label>
          <input
            id="confirm_password"
            name="confirm_password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className="mt-1.5 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div className="flex items-start gap-2.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
          <input
            id="is_instructor"
            name="is_instructor"
            type="checkbox"
            checked={isInstructor}
            onChange={(event) => setIsInstructor(event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          <label htmlFor="is_instructor" className="text-sm text-slate-700">
            <span className="font-medium">I am an instructor</span>
            {isInstructor && (
              <span className="mt-1 block text-xs text-slate-500">
                You&apos;ll be asked for your institutional credentials next, and your account will stay
                pending until an admin verifies it.
              </span>
            )}
          </label>
        </div>

        <SubmitButton />
      </form>
    </div>
  );
}
