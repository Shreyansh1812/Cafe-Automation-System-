async function main() {
  try {
    const bcrypt = await import("bcryptjs");

    const hashDemo = '$2b$10$EW7eQQR7IdeC5p.BiPZZluAfgE4806E/SedKILu7sX8VdTbVqBBHS'; // barista@cafe.com
    const hashTest = '$2b$10$Oi5bOYWWjpiAPeUon9rv.uNiCJJB.wlrLAF8MS70zRSnCSMUcWGBK'; // barista@test.com
    const hashDhruvin = '$2b$10$THhus3OKsaYs6mjpWitYw.ARaAoB2JyEo0qVvVJ3jx6s.PUUDXptq'; // DHRUVIN PATEL

    console.log("Comparing 'demo' with hashDemo:", await bcrypt.default.compare("demo", hashDemo));
    console.log("Comparing 'demo' with hashTest:", await bcrypt.default.compare("demo", hashTest));
    console.log("Comparing 'demo' with hashDhruvin:", await bcrypt.default.compare("demo", hashDhruvin));

    // Let's also verify if hashing and comparing works with bcrypt.default:
    const testPlain = "testing123";
    const testHash = await bcrypt.default.hash(testPlain, 10);
    console.log("Bcrypt hashed testPlain:", testHash);
    console.log("Bcrypt default compare testPlain:", await bcrypt.default.compare(testPlain, testHash));

    process.exit(0);
  } catch (err) {
    console.error("Bcrypt test error:", err);
    process.exit(1);
  }
}

main();
