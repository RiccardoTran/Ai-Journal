// // src/App.js
// import React from 'react';
// import Calendar from './Calendar';

// const App = () => {
//   return (
    
//     <div className="App">
//       <Calendar />
//     </div>
//   );
// };

// export default App;

// src/App.js
// src/App.js
// src/Register.js
import React, { useState } from 'react';
import axios from 'axios';

const Register = ({ onRegister, onSwitchToLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:3000/api/auth/register', { username, password });
      onRegister();
    } catch (error) {
      console.error('Error registering');
    }
  };

  return (
    <div className="Register">
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit">Register</button>
      </form>
      <button onClick={onSwitchToLogin}>Switch to Login</button>
    </div>
  );
};

export default Register;
