import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="border-t border-white/6 px-4 py-12">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col items-center justify-between gap-8 sm:flex-row sm:items-start">
          <div className="flex flex-col items-center gap-2 sm:items-start">
            <Link href="/" className="flex items-center gap-2 select-none">
              <Image
                src="/logo.png"
                alt="Forge"
                width={28}
                height={28}
                className="h-7 w-auto rounded-md"
              />
            </Link>
            <p className="max-w-xs text-center text-xs text-white/30 sm:text-left transition-colors duration-200 hover:text-white/60">
              Describe the app. Forge writes the code.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 text-center sm:text-left">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">
                Product
              </p>
              <ul className="space-y-2 text-sm text-white/50">
                <li>
                  <Link
                    href="/#features"
                    className="transition-colors duration-200 hover:text-white"
                  >
                    Features
                  </Link>
                </li>
                <li>
                  <Link
                    href="/#pricing"
                    className="transition-colors duration-200 hover:text-white"
                  >
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link
                    href="/projects"
                    className="transition-colors duration-200 hover:text-white"
                  >
                    Projects
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">
                Company
              </p>
              <ul className="space-y-2 text-sm text-white/50">
                <li>
                  <a
                    href="mailto:hello@forge.app"
                    className="transition-colors duration-200 hover:text-white"
                  >
                    Contact
                  </a>
                </li>
                <li>
                  <Link
                    href="/privacy"
                    className="transition-colors duration-200 hover:text-white"
                  >
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms"
                    className="transition-colors duration-200 hover:text-white"
                  >
                    Terms
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/6 pt-6 text-xs text-white/20 sm:flex-row">
          <p>© {new Date().getFullYear()} Forge. All rights reserved.</p>
          <p className="transition-colors duration-200 hover:text-white/50">
            Built on Google Gemini.
          </p>
        </div>
      </div>
    </footer>
  );
}
