import { toast } from "@/shadcn/hooks/use-toast";
import { Button } from "@/shadcn/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shadcn/ui/card";
import { Input } from "@/shadcn/ui/input";
import { Label } from "@/shadcn/ui/label";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";

export default function Login({}) {
  const router = useRouter();

  const [email, setEmail] = useState("");

  async function postData() {
    await fetch(`/api/v1/auth/password-reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, link: window.location.origin }),
    })
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {

          toast({
            variant: "default",
            title: "Success",
            description: "Password reset email is on its way.",
          });
          router.push("/auth/login");
        } else {
          toast({
            variant: "destructive",
            title: "Error", 
            description:
              "There was an error with this request, please try again. If this issue persists, please contact support via the discord.",
          });
        }
      });
  }

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <a target="_blank" href={process.env.BASE_URL ?? "https://pepperminto.dev"}>
          <img
            className="mx-auto h-36 w-auto"
            src="/login.svg"
            alt="pepperminto.dev logo"
          />
        </a>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground">
          Request Password Reset
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="border-border/60 bg-card/80 shadow-lg backdrop-blur">
          <CardHeader className="space-y-2 text-center">
            <CardTitle className="text-xl text-foreground">
              Reset your password
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              We’ll send you a reset link.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label htmlFor="email" className="text-sm text-foreground">
                Email address
              </Label>
              <div className="mt-2">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-background/60"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm">
                <Link
                  href="/auth/login"
                  className="font-medium text-primary hover:text-primary/80"
                >
                  Remember your password?
                </Link>
              </div>
            </div>

            <div>
              <Button
                type="submit"
                onClick={postData}
                className="w-full"
              >
                Submit Request
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-center flex flex-col space-y-2">
          <span className="font-bold text-foreground">
            Built with 💚 by Pepperminto Labs
          </span>
          <a
            href={process.env.KNOWLEDGE_BASE_URL ?? process.env.BASE_URL ?? "https://pepperminto.dev"}
            target="_blank"
            className="text-foreground"
          >
            Help Center
          </a>
        </div>
      </div>
    </div>
  );
}
