const express = require("express");

const app = express();
const port = process.env.PORT || 8080;
const employees = new Map();
let nextId = 1;
const employeeFieldTypes = {
  name: "string",
  designation: "string",
  department: "string",
  salary: "number",
  experience: "number",
  isActive: "boolean",
  employeecode: "string"
};

app.use(express.json());

function isEmployeeObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireJsonObject(req, res, next) {
  if (!isEmployeeObject(req.body)) {
    return res.status(400).json({ error: "Request body must be a JSON object" });
  }

  next();
}

function validateEmployeeFields(partial = false) {
  return (req, res, next) => {
    const fields = Object.keys(req.body);
    const unknownField = fields.find((field) => !Object.hasOwn(employeeFieldTypes, field));

    if (unknownField) {
      return res.status(400).json({ error: `Unknown employee field: ${unknownField}` });
    }

    const missingField = partial
      ? null
      : Object.keys(employeeFieldTypes).find((field) => !Object.hasOwn(req.body, field));

    if (missingField) {
      return res.status(400).json({ error: `Missing required employee field: ${missingField}` });
    }

    const invalidField = fields.find((field) => typeof req.body[field] !== employeeFieldTypes[field]);

    if (invalidField) {
      return res.status(400).json({
        error: `Employee field '${invalidField}' must be a ${employeeFieldTypes[invalidField]}`
      });
    }

    next();
  };
}

function parseEmployeeId(value) {
  if (!/^[1-9]\d*$/.test(value)) {
    return null;
  }

  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

app.get("/employees", (req, res) => {
  res.status(200).json(Array.from(employees.values()));
});

app.post("/employees", requireJsonObject, validateEmployeeFields(), (req, res) => {
  const id = nextId++;
  const employee = { ...req.body, id };

  employees.set(id, employee);
  res.status(201).json(employee);
});

app.get("/employees/:id", (req, res) => {
  const id = parseEmployeeId(req.params.id);
  const employee = id === null ? undefined : employees.get(id);

  if (!employee) {
    return res.status(404).json({ error: "Employee not found" });
  }

  res.status(200).json(employee);
});

app.put("/employees/:id", requireJsonObject, validateEmployeeFields(), (req, res) => {
  const id = parseEmployeeId(req.params.id);

  if (id === null || !employees.has(id)) {
    return res.status(404).json({ error: "Employee not found" });
  }

  const employee = { ...req.body, id };
  employees.set(id, employee);
  res.status(200).json(employee);
});

app.patch("/employees/:id", requireJsonObject, validateEmployeeFields(true), (req, res) => {
  const id = parseEmployeeId(req.params.id);
  const existingEmployee = id === null ? undefined : employees.get(id);

  if (!existingEmployee) {
    return res.status(404).json({ error: "Employee not found" });
  }

  const employee = { ...existingEmployee, ...req.body, id };
  employees.set(id, employee);
  res.status(200).json(employee);
});

app.delete("/employees/:id", (req, res) => {
  const id = parseEmployeeId(req.params.id);

  if (id === null || !employees.has(id)) {
    return res.status(404).json({ error: "Employee not found" });
  }

  employees.delete(id);
  res.status(200).json({ message: "Employee deleted successfully" });
});

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use((error, req, res, next) => {
  const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 600
    ? error.status
    : 500;
  const message = status === 400
    ? "Request body must be valid JSON"
    : status === 413
      ? "Request body is too large"
      : status === 415
        ? "Unsupported request content"
        : "Internal server error";

  res.status(status).json({ error: message });
});

if (require.main === module) {
  const server = app.listen(port, () => {
    console.log(`Employee Directory API listening on port ${server.address().port}`);
  });
}

module.exports = app;
