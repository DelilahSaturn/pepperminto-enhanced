import type { NextRequest } from "next/server";

async function proxy(request: NextRequest) {
  const apiUrl = process.env.API_URL || "http://localhost:3001";
  const path = request.nextUrl.pathname.replace("/api/v1/", "");
  const targetUrl = new URL(`/api/v1/${path}`, apiUrl);
  targetUrl.search = request.nextUrl.search;

  const headers = new Headers(request.headers);
  headers.delete("host");

  const init: RequestInit = {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await request.arrayBuffer(),
  };

  const response = await fetch(targetUrl.toString(), init);
  return new Response(response.body, {
    status: response.status,
    headers: response.headers,
  });
}

export async function GET(request: NextRequest) {
  return proxy(request);
}

export async function POST(request: NextRequest) {
  return proxy(request);
}

export async function PUT(request: NextRequest) {
  return proxy(request);
}

export async function PATCH(request: NextRequest) {
  return proxy(request);
}

export async function DELETE(request: NextRequest) {
  return proxy(request);
}
