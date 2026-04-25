import jwt from "jsonwebtoken";

export function checkToken(token: string) {
  const bearer = token;

  const secret = Buffer.from(process.env.SECRET!, "base64");

  const verified = jwt.verify(bearer, secret);

  return verified;
}