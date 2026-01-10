export async function uploadToBbImage(
  buffer: Buffer,
  filename = "render.png"
) {
  if (!process.env.BBIMAGE_KEY) {
    throw new Error("BBIMAGE_KEY is not set");
  }

  const formData = new FormData();

  formData.append("image", buffer.toString("base64"));
  formData.append("name", filename.replace(".png", ""));

  const res = await fetch(
    `https://api.imgbb.com/1/upload?key=${process.env.BBIMAGE_KEY}`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`bbImage upload failed: ${errText}`);
  }

  const json = await res.json();

  return {
    url: json.data.url,           
  };
}
