const http = require('http');
const express = require('express');
const app = express();
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const { VectorSearch } = require('./vectorSearch');
const vectorSearch = new VectorSearch();

const morgan = require('morgan');
const cors = require('cors');
const AgentPrompts = require('./enum/AgentPrompts');

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const {
  Request,
  ChatHistory,
  Holder,
  ChatInferenceLlama3_8B
} = require('./modrefactored'); // Adjust the path as needed


app.use(express.static('dist'));
app.use(express.json());
app.use(morgan('tiny'));
app.use(cors());

const LogPost = require('./models/LogPost');
const LogPostComment = require('./models/Comment');
const { timeStamp } = require('console');
const url = process.env.MONGODB_URI;

// Custom token to log request body
morgan.token('body', (req) => JSON.stringify(req.body));

// Using morgan with the custom token
app.use(morgan(':method :url :status :res[content-length] - :response-time ms :body'));

// GET all log posts
app.get('/api/logposts', (request, response) => {
  LogPost.find({}).then(logPosts => {
    response.json(logPosts);
  });
});

// POST CHAT
app.post('/api/chat', async (req, res) => {
  try {
      const {prompt} = req.body;
      const response = await ChatInferenceLlama3_8B( prompt, "Marco", AgentPrompts.FITNESS);
      console.log(response);
      res.json({ user: "AIBot", response: response });
  } catch (err) {
      console.error('Error:', err);
      res.status(500).json({ error: 'An error occurred while processing the request' });
  }
});


// GET log post by ID
app.get('/api/logposts/:id', (request, response, next) => {
  const id = request.params.id;
  LogPost.findById(id).then(logPost => {
    if (logPost) {
      response.json(logPost);
    } else {
      response.status(404).end();
    }
  }).catch(error => next(error));
});

// GET comments by logPostID
app.get('/api/comments/:idLogPost', (request, response, next) => {
  const idLogPost = request.params.idLogPost;
  Comment.find({ idLogPost: idLogPost })
    .then(comments => {
      response.json(comments);
    })
    .catch(error => next(error));
});

// GET log posts by date
app.get('/api/logposts/date/:date', (request, response, next) => {
  const date = request.params.date;
  LogPost.find({ date: date })
    .then(logPosts => {
      response.json(logPosts);
    })
    .catch(error => next(error));
});


// POST a new log post
app.post('/api/logposts', (request, response, next) => {
  const body = request.body;

  if (!body.title || !body.content) {
    return response.status(400).json({
      error: "title or content missing"
    });
  }

  const logPost = new LogPost({
    title: body.title,
    content: body.content,
    date: body.date
  });

  logPost.save().then(savedLogPost => {
    response.status(201).json(savedLogPost);
  }).catch(error => next(error));
});

// POST a new comment
app.post('/api/comments/', (request, response, next) => {
  const body = request.body;

  if (!body.user || !body.content) {
    return response.status(400).json({
      error: "user or content missing"
    });
  }

  const comment = new LogPostComment({
    idComment: uuidv4(),
    idLogPost: body.idLogPost, // ID del log post
    user: body.user, // Nome dell'autore
    content: body.content, // Contenuto del commento
    date: new Date() // Data corrente
  });

  comment.save().then(savedComment => {
    response.status(201).json(savedComment);
  }).catch(error => next(error));
});

// GET the comment by date
app.get('/api/comments/:date', (request, response, next) => {
  const date = request.params.date;
  Comment.find({ date: date })
    .then(comments => {
      response.json(comments);
    })
    .catch(error => next(error));
});


// PUT update log post by ID
app.put('/api/logposts/:id', (request, response, next) => {
  const id = request.params.id;
  const body = request.body;

  const logPost = {
    title: body.title,
    content: body.content,
    date: body.date
  };

  LogPost.findByIdAndUpdate(id, logPost, { new: true })
    .then(updatedLogPost => {
      response.json(updatedLogPost);
    })
    .catch(error => next(error));
});

// PUT update log post by date
app.put('/api/logposts/date/:date', async (request, response, next) => {
  const date = request.params.date;
  const body = request.body;

  try {
    const logPost = await LogPost.findOne({ date: date });

    if (!logPost) {
      return response.status(404).json({ error: 'Log post not found' });
    }

    logPost.content = body.content;

    const updatedLogPost = await logPost.save();
    response.json(updatedLogPost);
  } catch (error) {
    next(error);
  }
});

// DELETE log post by ID
app.delete('/api/logposts/:id', (request, response, next) => {
  LogPost.findByIdAndRemove(request.params.id)
    .then(result => {
      if (result) {
        response.status(204).end();
      } else {
        response.status(404).send({ error: 'not found' });
      }
    })
    .catch(error => next(error));
});

// INFO endpoint
app.get('/info', (request, response) => {
  LogPost.countDocuments({}).then(count => {
    const currentDate = new Date();
    response.send(`
      <p>Blog has info for ${count} log posts.</p>
      <p>${currentDate}</p>`
    );
  });
});

// Unknown endpoint handler
const unknownEndpoint = (request, response) => {
  response.status(404).send({ error: 'unknown endpoint' });
};

// Error handler middleware
const errorHandler = (error, request, response, next) => {
  console.error('ErrorHandler middleware called:', error.message);

  if (error.name === 'CastError') {
    return response.status(400).send({ error: 'malformatted id' });
  }
  if (error.name === 'ValidationError') {
    return response.status(400).json({ error: error.message });
  }
  if (error.name === 'MongoError' && error.code === 11000) {
    return response.status(409).json({ error: 'duplicate key error' });
  }
  if (error.name === 'SyntaxError') {
    return response.status(400).send({ error: 'bad request' });
  }
  if (error.name === 'TypeError') {
    return response.status(500).send({ error: 'internal server error' });
  }
  if (error.name === 'ReferenceError') {
    return response.status(500).send({ error: 'internal server error' });
  }

  console.error('Passing error to default error handler');
  next(error);
};

// Vector search endpoints
app.post('/api/vector/documents', async (req, res) => {
  try {
    const { title, content } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({
        error: "title or content missing"
      });
    }

    const result = await vectorSearch.addDocument(title, content);
    res.status(201).json(result);
  } catch (err) {
    console.error('Error in vector document creation:', err);
    res.status(500).json({ error: 'An error occurred while processing the request' });
  }
});

app.get('/api/vector/search', async (req, res, next) => {
  try {
    const { query, limit = 5, threshold = 0.7 } = req.query;
    
    if (!query) {
      return res.status(400).json({
        error: "search query missing"
      });
    }

    const results = await vectorSearch.search(
      query,
      parseInt(limit),
      parseFloat(threshold)
    );

    res.json(results);
  } catch (err) {
    console.error('Error in vector search:', err);
    next(err);
  }
});

// Use unknown endpoint and error handler middleware
app.use(unknownEndpoint);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
