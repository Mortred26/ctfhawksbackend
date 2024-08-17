const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(express.json());

const userRouter = require('./routes/user');
const testRouter = require('./routes/test');

app.use('/api/users', userRouter);
app.use('/api/tests', testRouter);

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  dbName: 'RedHawks'
})
  .then(() => console.log('MongoDB connected...'))
  .catch(err => console.error('Could not connect to MongoDB:', err));

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Server running on port ${port}`));
