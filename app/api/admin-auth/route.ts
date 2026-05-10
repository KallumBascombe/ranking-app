export async function POST(req: Request) {
  const { password } = await req.json();

  if (password === "test123") {
    return Response.json({ success: true });
  }

  return new Response("Unauthorized", { status: 401 });
}