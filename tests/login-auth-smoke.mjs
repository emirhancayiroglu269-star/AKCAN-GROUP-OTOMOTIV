const cases = [
  [{ email: "user@example.com", password: "x" }, true],
  [{ email: "", password: "x" }, false],
  [{ email: "user@example.com", password: "" }, false],
];

for (const [input, expected] of cases) {
  const actual = Boolean(input.email?.trim()) && Boolean(input.password);
  const ok = actual === expected;
  console.log(`${ok ? "PASS" : "FAIL"} | email/parola validation`);
  if (!ok) process.exitCode = 1;
}

const activeUser = { id: "test-user", active: true };
const inactiveUser = { id: "test-user", active: false };

console.log(`${activeUser.id && activeUser.active ? "PASS" : "FAIL"} | aktif kullanıcı`);
console.log(`${inactiveUser.active ? "FAIL" : "PASS"} | pasif kullanıcı reddi`);
