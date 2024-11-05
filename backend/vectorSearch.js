const mongoose = require('mongoose');
const { QueryMaker, Request, Holder, ChatHistory, AiContext } = require('./modrefactored');

// Schema definition with vector field
const logPostSchema = new mongoose.Schema({
  title: String,
  content: String,
  id: Number,
  contentVector: {
    type: [Number],
    index: true,
    required: true,
  }
});


const LogPost = mongoose.model('LogPost', logPostSchema);

class VectorSearch {
  constructor() {
    this.request = new Request();
    this.chatHistory = new ChatHistory();
    this.holder = new Holder(this.chatHistory, {
      GetGroqKey: () => process.env.GROQ_API_KEY
    }, this.request);
  }

  // Generate embedding using Groq
  async generateEmbedding(text) {
    const params = {
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: {
        model: "llama-3.1-70b-versatile",
        input: text,
        encoding_format: "float"
      }
    };

    const response = await this.request.Post(
      "https://api.groq.com/v1/embeddings",
      params,
      payload => payload.data[0].embedding
    );

    return response.isValid ? response.payload.data : null;
  }

  // Generate search query using Groq
  async generateSearchQuery(userQuery) {
    const searchContext = "Generate a clear and concise search query that captures the main concepts and intent from the user's input. Focus on key terms and semantic meaning.";
    
    return await QueryMaker(
      this.holder,
      userQuery,
      searchContext
    );
  }

  // Add a new document with vector embedding
  async addDocument(title, content) {
    try {
      const contentEmbedding = await this.generateEmbedding(content);
      
      if (!contentEmbedding) {
        throw new Error("Failed to generate embedding");
      }

      const logPost = new LogPost({
        title,
        content,
        contentVector: contentEmbedding
      });

      return await logPost.save();
    } catch (error) {
      console.error('Error adding document:', error);
      throw error;
    }
  }

  // Perform vector search
  async search(userQuery, limit = 5, threshold = 0.7) {
    try {
      // Generate optimized search query
      const searchQuery = await this.generateSearchQuery(userQuery);
      
      // Generate embedding for the search query
      const queryEmbedding = await this.generateEmbedding(searchQuery);

      if (!queryEmbedding) {
        throw new Error("Failed to generate query embedding");
      }

      // Perform vector search using MongoDB Atlas
      const results = await LogPost.aggregate([
        {
          $search: {
            knnBeta: {
              vector: queryEmbedding,
              path: "contentVector",
              k: limit * 2, // Get more results for filtering
              filter: {} // Optional: Add any additional filters here
            }
          }
        },
        {
          $project: {
            title: 1,
            content: 1,
            score: { $meta: "searchScore" },
            _id: 1
          }
        }
      ]);

      // Filter results by score threshold and limit
      return results
        .filter(result => result.score >= threshold)
        .slice(0, limit);

    } catch (error) {
      console.error('Error performing vector search:', error);
      throw error;
    }
  }
}

// Express route handler setup
function setupVectorSearchRoutes(app) {
  const vectorSearch = new VectorSearch();

  // Add new document with vector embedding
  app.post('/api/vector/documents', async (req, res) => {
    try {
      const { title, content } = req.body;
      
      if (!title || !content) {
        return res.status(400).json({ error: 'Title and content are required' });
      }

      const result = await vectorSearch.addDocument(title, content);
      res.status(201).json(result);
    } catch (error) {
      console.error('Error in POST /api/vector/documents:', error);
      res.status(500).json({ error: 'Failed to add document' });
    }
  });

  // Perform vector search
  app.get('/api/vector/search', async (req, res) => {
    try {
      const { query, limit = 5, threshold = 0.7 } = req.query;
      
      if (!query) {
        return res.status(400).json({ error: 'Search query is required' });
      }

      const results = await vectorSearch.search(
        query,
        parseInt(limit),
        parseFloat(threshold)
      );

      res.json(results);
    } catch (error) {
      console.error('Error in GET /api/vector/search:', error);
      res.status(500).json({ error: 'Search failed' });
    }
  });
}

module.exports = {
  VectorSearch,
  setupVectorSearchRoutes
};