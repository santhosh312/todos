const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const { format, isValid } = require("date-fns");

const databasePath = path.join(__dirname, "todoApplication.db");

const app = express();

app.use(express.json());

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () =>
      console.log("Server Running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const statusValues = ["TO DO", "IN PROGRESS", "DONE"];
const priorityValues = ["LOW", "MEDIUM", "HIGH"];
const categoryValues = ["WORK", "HOME", "LEARNING"];

const hasPriorityAndStatusProperties = (requestQuery) => {
  return (
    requestQuery.priority !== undefined && requestQuery.status !== undefined
  );
};

const hasCategoryAndStatusProperties = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.status !== undefined
  );
};

const hasPriorityAndCategoryProperties = (requestQuery) => {
  return (
    requestQuery.priority !== undefined && requestQuery.category !== undefined
  );
};

const hasPriorityProperty = (requestQuery) => {
  return requestQuery.priority !== undefined;
};

const hasStatusProperty = (requestQuery) => {
  return requestQuery.status !== undefined;
};

const hasCategoryProperty = (requestQuery) => {
  return requestQuery.category !== undefined;
};

app.get("/todos/", async (request, response) => {
  let data = null;
  let getTodosQuery = "";
  const { search_q = "", priority, status, category } = request.query;

  if (!statusValues.includes(status) && status !== undefined) {
    return response.status(400).send("Invalid Todo Status");
  }

  if (!priorityValues.includes(priority) && priority !== undefined) {
    return response.status(400).send("Invalid Todo Priority");
  }

  if (!categoryValues.includes(category) && category !== undefined) {
    return response.status(400).send("Invalid Todo Category");
  }

  switch (true) {
    case hasPriorityAndStatusProperties(request.query):
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND status = '${status}'
        AND priority = '${priority}';`;
      break;
    case hasCategoryAndStatusProperties(request.query):
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND status = '${status}'
        AND category = '${category}';`;
      break;
    case hasPriorityAndCategoryProperties(request.query):
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND category = '${category}'
        AND priority = '${priority}';`;
      break;

    case hasPriorityProperty(request.query):
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND priority = '${priority}';`;
      break;
    case hasStatusProperty(request.query):
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND status = '${status}';`;
      break;
    case hasCategoryProperty(request.query):
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND category = '${category}';`;
      break;
    default:
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%';`;
  }

  data = await database.all(getTodosQuery);
  const updatedData = data.map((item) => ({
    id: item.id,
    todo: item.todo,
    category: item.category,
    priority: item.priority,
    status: item.status,
    dueDate: item.due_date,
  }));

  response.send(updatedData);
});

app.get("/agenda/", async (request, response) => {
  let data = null;
  const { date } = request.query;
  if (!isValid(new Date(date))) {
    return response.status(400).send("Invalid Due Date");
  }

  const updatedDate = format(new Date(date), "yyyy-MM-dd");

  const getTodoQuery = `SELECT * FROM todo WHERE due_date='${updatedDate}';`;
  data = await database.all(getTodoQuery);
  const updatedData = data.map((item) => ({
    id: item.id,
    todo: item.todo,
    priority: item.priority,
    status: item.status,
    category: item.category,
    dueDate: item.due_date,
  }));

  response.send(updatedData);
});

app.get("/todos/:todoId", async (request, response) => {
  const { todoId } = request.params;

  const getTodoQuery = `SELECT * FROM todo WHERE id=${todoId};`;
  const data = await database.get(getTodoQuery);
  const { id, todo, status, category, priority } = data;
  const dueDate = data.due_date;
  const updatedTodo = { id, todo, priority, status, category, dueDate };
  response.send(updatedTodo);
});

app.post("/todos/", async (request, response) => {
  const { id, todo, status, category, priority, dueDate } = request.body;

  if (!statusValues.includes(status)) {
    return response.status(400).send("Invalid Todo Status");
  }

  if (!priorityValues.includes(priority)) {
    return response.status(400).send("Invalid Todo Priority");
  }

  if (!categoryValues.includes(category)) {
    return response.status(400).send("Invalid Todo Category");
  }

  if (!isValid(new Date(dueDate))) {
    return response.status(400).send("Invalid Due Date");
  }

  const postTodoQuery = `INSERT INTO todo (id, todo, priority, status, category, due_date) VALUES (${id}, '${todo}', '${priority}', '${status}', '${category}', '${dueDate}');`;

  await database.run(postTodoQuery);
  response.send("Todo Successfully Added");
});

module.exports = app;
