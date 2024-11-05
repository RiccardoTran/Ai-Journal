const mongoose = require('mongoose');

if (process.argv.length < 3) {
  console.log('give password as argument');
  process.exit(1);
}

const password = process.argv[2];

const url = process.env.MONGODB_URI;

mongoose.set('strictQuery', false);

mongoose.connect(url);

const logPostSchema = new mongoose.Schema({
  title: String,
  content: String,
  id: Number,
});

const LogPost = mongoose.model('LogPost', logPostSchema);

const logPost = new LogPost({
  title: process.argv[3],
  content: process.argv[4],
});

// logPost.save().then(result => {
//   console.log('log post saved!');
//   mongoose.connection.close();
// });

LogPost.find({}).then(result => {
  result.forEach(logPost => {
    console.log(logPost);
  });
  mongoose.connection.close();
});
