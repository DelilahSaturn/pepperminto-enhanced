import { getCookie } from "cookies-next";
import useTranslation from "next-translate/useTranslation";
import { useRouter } from "next/router";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shadcn/ui/card";
import { Button } from "@/shadcn/ui/button";
import { Input } from "@/shadcn/ui/input";
import { Label } from "@/shadcn/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shadcn/ui/select";

import { useUser } from "../store/session";

export default function UserProfile() {
  const { user } = useUser();
  const token = getCookie("session");

  const { t } = useTranslation("peppermint");

  const router = useRouter();

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user.email);
  const [language, setLanguage] = useState(user.language);

  function changeLanguage(locale) {
    setLanguage(locale);
    router.push(router.pathname, router.asPath, {
      locale,
    });
  }

  async function updateProfile() {
    await fetch(`/api/v1/auth/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({
        id: user.id,
        // If name is blank, fall back to email so clients always have a display name
        name: name && String(name).trim().length > 0 ? name : user.email,
        email: email ? email : user.email,
        language: language ? language : user.language,
      }),
    });
  }

  return (
    <div className="flex justify-center items-center h-[70vh]">
      <Card>
        <CardHeader>
          <CardTitle>{t("profile")}</CardTitle>
          <CardDescription>{t("profile_desc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mt-6 flex flex-col lg:flex-row">
            <div className="flex-grow space-y-6">
              <div>
                <Label className="text-sm text-foreground">
                  {t("name")}
                </Label>
                <div className="mt-2">
                  <Input
                    type="text"
                    name="name"
                    id="name"
                    autoComplete="name"
                    className="bg-background/60"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm text-foreground">
                  {t("email")}
                </Label>
                <div className="mt-2">
                  <Input
                    type="email"
                    name="email"
                    autoComplete="email"
                    className="bg-background/60"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label className="text-sm text-foreground">
                  {t("language")}
                </Label>
                <Select value={language} onValueChange={changeLanguage}>
                  <SelectTrigger className="mt-2 bg-background/60">
                    <SelectValue placeholder={t("language")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                    <SelectItem value="se">Swedish</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="no">Norwegian</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="tl">Tagalong</SelectItem>
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
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <div className="flex w-full justify-end">
            <Button
              onClick={async () => {
                await updateProfile();
                router.reload();
              }}
              type="submit"
            >
              {t("save_and_reload")}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
