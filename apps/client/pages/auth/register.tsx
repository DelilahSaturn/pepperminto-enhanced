import { toast } from "@/shadcn/hooks/use-toast";
import { Button } from "@/shadcn/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shadcn/ui/card";
import { Input } from "@/shadcn/ui/input";
import { Label } from "@/shadcn/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shadcn/ui/select";
import { useRouter } from "next/router";
import { useState } from "react";

export default function Login({}) {
  const router = useRouter();

  const validateEmail = (email) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  };

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [language, setLanguage] = useState("en");
  const [status, setStatus] = useState("idle");

  async function postData() {
    if (password === passwordConfirm && validateEmail(email)) {
      setStatus("loading");

      const response = await fetch("/api/v1/auth/user/register/external", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
          passwordConfirm,
          language,
        }),
      }).then((res) => res.json());

      if (response.success) {
        setStatus("idle");
        router.push("/auth/login");
      } else {
        setStatus("idle");
        toast({
          variant: "destructive",
          title: "Error",
          description: response.message,
        });
      }
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Passwords do not match or email is invalid",
      });
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground">
          Create your new account
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        {status === "loading" ? (
          <div className="text-center mr-4">{/* <Loader size={32} /> */}</div>
        ) : (
          <Card className="border-border/60 bg-card/80 shadow-lg backdrop-blur">
            <CardHeader className="space-y-2 text-center">
              <CardTitle className="text-xl text-foreground">
                Sign up for Pepperminto
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                External user registration.
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

              <div className="space-y-2">
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
                    value={password}
                    className="bg-background/60"
                  />
                </div>
                <Label htmlFor="passwordConfirm" className="text-sm text-foreground">
                  Confirm Password
                </Label>
                <div className="mt-2">
                  <Input
                    id="passwordConfirm"
                    name="passwordConfirm"
                    type="password"
                    autoComplete="password"
                    required
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    className="bg-background/60"
                  />
                </div>

                <Label className="text-sm text-foreground">Language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="mt-2 bg-background/60">
                    <SelectValue placeholder="Select a language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                    <SelectItem value="se">Swedish</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="no">Norwegian</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="pt">Tagalong</SelectItem>
                    <SelectItem value="da">Danish</SelectItem>
                    <SelectItem value="pt">Portuguese</SelectItem>
                    <SelectItem value="it">Italiano</SelectItem>
                    <SelectItem value="he">Hebrew</SelectItem>
                    <SelectItem value="tr">Turkish</SelectItem>
                    <SelectItem value="hu">Hungarian</SelectItem>
                    <SelectItem value="th">Thai (ภาษาไทย)</SelectItem>
                    <SelectItem value="zh-CN">
                      Simplified Chinese (简体中文)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Button
                  type="submit"
                  onClick={postData}
                  className="w-full"
                >
                  Create Account
                </Button>

                <p className="mt-2 text-xs text-muted-foreground text-center">
                  Note this form is for external users only
                </p>
              </div>
            </CardContent>
          </Card>
        )}

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
