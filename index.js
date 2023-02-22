require('dotenv').config();
const morgan = require('morgan');
const express = require('express');
const app = express();
const cors = require('cors');
const Person = require('./models/person');

app.use(express.static('build'));
app.use(express.json());
app.use(cors());
morgan.token('data', (request) => JSON.stringify(request.body));
app.use(
  morgan(':method :url :status :res[content-length] - :response-time ms :data')
);

const unknownEndpoint = (request, response) => {
  response.status(404).send({ error: 'unknown endpoint' });
};

const errorHandler = (error, request, response, next) => {
  console.error(error.message);
  if (error.name === 'CastError') {
    return response.status(400).send({ error: 'malformatted id' });
  } else if (error.name === 'ValidationError') {
    return response.status(400).json({ error: error.message });
  }

  next(error);
};

app.get('/api/persons', (request, response) => {
  Person.find({}).then((persons) => {
    response.json(persons);
  });
});

app.get('/info', (request, response) => {
  const date = new Date();
  const now = date.toLocaleString('en-GB', {
    timeZone: 'Europe/Helsinki',
    timeStyle: 'full',
    dateStyle: 'full'
  });
  Person.countDocuments({}, (err, count) => {
    response.send(`Phonebook has info for ${count} people <p></p> ${now}`);
  });
});

app.get('/api/persons/:id', (request, response, next) => {
  Person.findById(request.params.id)
    .then((person) => {
      if (person) {
        response.json(person);
      } else {
        response.status(404).end();
      }
    })
    .catch((error) => next(error));
});

app.delete('/api/persons/:id', (request, response, next) => {
  Person.findByIdAndRemove(request.params.id)
    .then(() => {
      response.status(204).end();
    })
    .catch((error) => next(error));
});

app.put('/api/persons/:id', (request, response, next) => {
  Person.findByIdAndUpdate(
    request.params.id,
    { number: request.body.number },
    { new: true, runValidators: true, context: 'query' }
  )
    .then((updatedPerson) => {
      if (updatedPerson) {
        response.json(updatedPerson);
      } else {
        response.status(404).end();
      }
    })
    .catch((error) => {
      next(error);
    });
});

app.post('/api/persons', (request, response, next) => {
  const body = request.body;
  const person = new Person({
    name: body.name,
    number: body.number,
  });

  person
    .save()
    .then((savedPerson) => {
      response.json(savedPerson);
    })
    .catch((error) => next(error));
});

app.use(unknownEndpoint);
app.use(errorHandler);
const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
