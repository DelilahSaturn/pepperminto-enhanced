import { toast } from "@/shadcn/hooks/use-toast";
import { Button } from "@/shadcn/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shadcn/ui/card";
import { Input } from "@/shadcn/ui/input";
import { Label } from "@/shadcn/ui/label";
import { setCookie } from "cookies-next";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function Login({}) {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("idle");
  const [auth, setAuth] = useState("oauth");
  const [url, setUrl] = useState("");

  async function postData() {
    try {
      await fetch(`/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
        .then((res) => res.json())
        .then(async (res) => {
          if (res.user) {
            setCookie("session", res.token, { path: "/" });
            if (res.user.external_user) {
              router.push("/portal");
            } else {
              if (res.user.firstLogin) {
                router.push("/onboarding");
              } else {
                router.push("/");
              }
            }
          } else {
            toast({
              variant: "destructive",
              title: "Error",
              description:
                "There was an error logging in, please try again. If this issue persists, please contact support via the discord.",
            });
          }
        });
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Database Error",
        description:
          "This is an issue with the database, please check the docker logs or contact support via discord.",
      });
    }
  }

  async function oidcLogin() {
    await fetch(`/api/v1/auth/check`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    })
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.url) {
          setUrl(res.url);
        }
      });
  }

  useEffect(() => {
    oidcLogin();
  }, []);

  useEffect(() => {
    if (router.query.error) {
      toast({
        variant: "destructive",
        title: "Account Error - No Account Found",
        description:
          "It looks like you have tried to use SSO with an account that does not exist. Please try again or contact your admin to get you set up first.",
      });
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground">
          Welcome to Pepperminto
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        {status === "loading" ? (
          <div className="text-center mr-4">{/* <Loader size={32} /> */}</div>
        ) : (
          <Card className="border-border/60 bg-card/80 shadow-lg backdrop-blur">
            <CardHeader className="space-y-2 text-center">
              <CardTitle className="text-xl text-foreground">
                Sign in to your workspace
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Use your Pepperminto account to continue.
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
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        postData();
                      }
                    }}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="password" className="text-sm text-foreground">
                  Password
                </Label>
                <div className="mt-2">
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="password"
                    required
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-background/60"
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        postData();
                      }
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <Link
                    href="/auth/forgot-password"
                    className="font-medium text-primary hover:text-primary/80"
                  >
                    Forgot your password?
                  </Link>
                </div>
              </div>

              <div className="flex flex-col space-y-4">
                <Button
                  type="submit"
                  onClick={postData}
                  className="w-full"
                >
                  Sign In
                </Button>

                {url && (
                  <Button
                    type="submit"
                    variant="outline"
                    className="w-full"
                    onClick={() => { window.location.href = url; }}
                  >
                    Sign in with OIDC
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mt-8 text-center flex flex-col space-y-2">
          <span className="font-bold text-foreground">
            Built with 💚 by Pepperminto Labs
          </span>
          
          <a  href={process.env.KNOWLEDGE_BASE_URL ?? process.env.BASE_URL ?? "https://pepperminto.dev"}
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