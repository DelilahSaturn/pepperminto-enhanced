import { toast } from "@/shadcn/hooks/use-toast";
import { Button } from "@/shadcn/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shadcn/ui/card";
import { Input } from "@/shadcn/ui/input";
import { Label } from "@/shadcn/ui/label";
import { useRouter } from "next/router";
import { useState } from "react";

export default function Login({}) {
  const router = useRouter();

  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [view, setView] = useState("code");

  async function sendCode() {
    await fetch(`/api/v1/auth/password-reset/code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, uuid: router.query.token }),
    })
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          toast({
            variant: "default",
            title: "Success",
            description: "A password reset email is on its way.",
          });
          setView("password");
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

  async function updatPassword() {
    if (password.length < 1) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Password cannot be empty.",
      });
    } else {
      await fetch(`/api/v1/auth/password-reset/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, password }),
      })
        .then((res) => res.json())
        .then((res) => {
          if (res.success) {
            toast({
              variant: "default",
              title: "Success",
              description: "Password updated successfully.",
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
  }

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground">
          Reset Password
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="border-border/60 bg-card/80 shadow-lg backdrop-blur">
          <CardHeader className="space-y-2 text-center">
            <CardTitle className="text-xl text-foreground">
              Verify your reset code
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Enter the code sent to your email.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            {view === "code" ? (
              <>
                <div>
                  <Label htmlFor="code" className="text-sm text-foreground">
                    Code
                  </Label>
                  <div className="mt-2">
                    <Input
                      id="code"
                      name="code"
                      type="text"
                      autoComplete="off"
                      required
                      onChange={(e) => setCode(e.target.value)}
                      className="bg-background/60"
                    />
                  </div>
                </div>

                <div>
                  <Button
                    type="submit"
                    onClick={sendCode}
                    className="w-full"
                  >
                    Check Code
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label htmlFor="password" className="text-sm text-foreground">
                    New Password
                  </Label>
                  <div className="mt-2">
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="off"
                      required
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-background/60"
                    />
                  </div>
                </div>

                <div>
                  <Button
                    type="submit"
                    onClick={updatPassword}
                    className="w-full"
                  >
                    Change Password
                  </Button>
                </div>
              </>
            )}
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
