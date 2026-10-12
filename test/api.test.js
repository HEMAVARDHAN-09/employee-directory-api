const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const path = require("node:path");
const { once } = require("node:events");
const test = require("node:test");

const projectDirectory = path.resolve(__dirname, "..");
const serverFile = path.join(projectDirectory, "server.js");

async function startServer() {
  const child = spawn(process.execPath, [serverFile], {
    cwd: projectDirectory,
    env: { ...process.env, PORT: "0" },
    stdio: ["ignore", "pipe", "pipe"]
  });

  const startup = new Promise((resolve, reject) => {
    let output = "";
    const timeout = setTimeout(() => reject(new Error(`Server startup timed out: ${output}`)), 5000);

    child.stdout.on("data", (chunk) => {
      output += chunk.toString();
      const match = output.match(/listening on port (\d+)/);
      if (match) {
        clearTimeout(timeout);
        resolve({ child, baseUrl: `http://127.0.0.1:${match[1]}` });
      }
    });

    child.stderr.on("data", (chunk) => {
      output += chunk.toString();
    });

    child.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    child.once("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error(`Server exited before startup (code ${code}): ${output}`));
    });
  });

  return startup;
}

async function stopServer(child) {
  if (child.exitCode !== null) return;
  const exited = once(child, "exit");
  child.kill();
  await exited;
}

async function jsonRequest(baseUrl, route, options = {}) {
  const response = await fetch(`${baseUrl}${route}`, options);
  const contentType = response.headers.get("content-type") || "";
  assert.match(contentType, /application\/json/);
  return { response, body: await response.json() };
}

const employee = {
  name: "Priya Raman",
  designation: "Software Engineer",
  department: "Engineering",
  salary: 65000,
  experience: 3,
  isActive: true,
  employeecode: "EMP-1042"
};

test("employee CRUD API validates JSON, fields, statuses, and process-local storage", async () => {
  let { child, baseUrl } = await startServer();

  try {
    let result = await jsonRequest(baseUrl, "/employees");
    assert.equal(result.response.status, 200);
    assert.deepEqual(result.body, []);

    result = await jsonRequest(baseUrl, "/employees", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(employee)
    });
    assert.equal(result.response.status, 201);
    assert.deepEqual(result.body, { ...employee, id: 1 });

    result = await jsonRequest(baseUrl, "/employees/1");
    assert.equal(result.response.status, 200);
    assert.deepEqual(result.body, { ...employee, id: 1 });

    result = await jsonRequest(baseUrl, "/employees", { method: "GET" });
    assert.equal(result.response.status, 200);
    assert.deepEqual(result.body, [{ ...employee, id: 1 }]);

    const replacement = { ...employee, designation: "Senior Software Engineer" };
    result = await jsonRequest(baseUrl, "/employees/1", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(replacement)
    });
    assert.equal(result.response.status, 200);
    assert.deepEqual(result.body, { ...replacement, id: 1 });

    result = await jsonRequest(baseUrl, "/employees/1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ department: "People" })
    });
    assert.equal(result.response.status, 200);
    assert.equal(result.body.department, "People");
    assert.equal(result.body.name, employee.name);

    result = await jsonRequest(baseUrl, "/employees/invalid");
    assert.equal(result.response.status, 404);
    result = await jsonRequest(baseUrl, "/employees/999");
    assert.equal(result.response.status, 404);

    result = await jsonRequest(baseUrl, "/employees/1", {
      method: "DELETE"
    });
    assert.equal(result.response.status, 200);
    assert.deepEqual(result.body, { message: "Employee deleted successfully" });
    result = await jsonRequest(baseUrl, "/employees/1");
    assert.equal(result.response.status, 404);

    result = await jsonRequest(baseUrl, "/employees", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{invalid"
    });
    assert.equal(result.response.status, 400);

    result = await jsonRequest(baseUrl, "/employees", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...employee, salary: "65000" })
    });
    assert.equal(result.response.status, 400);

    result = await jsonRequest(baseUrl, "/unknown");
    assert.equal(result.response.status, 404);
  } finally {
    await stopServer(child);
  }

  ({ child, baseUrl } = await startServer());
  try {
    const result = await jsonRequest(baseUrl, "/employees");
    assert.equal(result.response.status, 200);
    assert.deepEqual(result.body, []);
  } finally {
    await stopServer(child);
  }
});
