

async function test() {
  try {
    console.log("Fetching /api/dashboard...");
    const res = await fetch("http://localhost:3000/api/dashboard", {
      headers: {
        "Accept": "application/json",
      }
    });
    console.log("Status:", res.status);
    console.log("Headers:", [...res.headers.entries()]);
    console.log("Body:", await res.text());
  } catch (err) {
    console.error(err);
  }
}

test();
