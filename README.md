# Employee Directory API

An Express REST API that stores employee records in memory. The store starts
empty whenever the server starts; records are not persisted.

## Run

```sh
npm install
npm start
```

The server listens on `PORT`, or port `8080` when `PORT` is unset.

Run the API tests with `npm test`.

## Endpoints

All request bodies must be JSON objects, and all responses include JSON.
New employees must include `name`, `designation`, `department`, `salary`,
`experience`, `isActive`, and `employeecode`. The API assigns each record a
numeric `id` when it is created; do not include `id` in the request body.
String fields must be strings, `salary` and `experience` must be numbers, and
`isActive` must be a boolean. `PUT` requires all employee fields, while `PATCH`
accepts any subset of them. Unknown fields are rejected.

Example `POST /employees` request:

```json
{
  "name": "Priya Raman",
  "designation": "Software Engineer",
  "department": "Engineering",
  "salary": 65000,
  "experience": 3,
  "isActive": true,
  "employeecode": "EMP-1042"
}
```

| Method | Path | Behavior | Success status |
| --- | --- | --- | --- |
| `GET` | `/employees` | List all employees | `200` |
| `POST` | `/employees` | Create an employee | `201` |
| `GET` | `/employees/:id` | Get one employee | `200` |
| `PUT` | `/employees/:id` | Replace an employee | `200` |
| `PATCH` | `/employees/:id` | Partially update an employee | `200` |
| `DELETE` | `/employees/:id` | Delete an employee | `200` |

Unknown routes and employee IDs return a JSON error with status `404`.
Malformed JSON and non-object request bodies return a JSON error with status
`400`.
