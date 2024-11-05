import React, { useState } from 'react';
import TextArea from './TextArea';
import MessageWrapper from './MessageWrapper';
import './LogChat.css';
import axios from 'axios';

const LogChat = ({ date, users = [] }) => {
  const [commentors, setCommentors] = useState([])
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [title, setTitle] = useState('Titolo');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tagging, setTagging] = useState(false);

  const handlePostLog = (outputData) => {
    // funzione vuota, ma qui si può fare uno script ogni qual volta che il log viene puttato o postato in DB
  };
  const handleInference = async (date) => {
    try {
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    const formattedDate = localDate.toISOString().split('T')[0];
    const log = await axios.get(`http://localhost:3000/api/logposts/date/${formattedDate}`);
    // Estrarre il testo da ogni blocco e concatenarlo in una singola stringa
    const fullText = JSON.parse(log.data[0].content).blocks.map(item => item.data.text).join("\n");
    console.log(fullText);


    const completion = await axios.post(`http://localhost:3000/api/chat`, {
          prompt: fullText
        });

    await axios.post(`http://localhost:3000/api/comments`, {
        content: completion.data.response,
        user: completion.data.user,
        idLogPost: log.idLogPost
    })
    console.log(completion.data.user + completion.data.response);
    
    setComments([...comments, completion.data.response]);
    setCommentors([...commentors, completion.data.user]);
  } catch (error) {
    console.error("Errore durante l'inferenza: ", error);
  }
  }

  const handlePostComment = () => {
    setComments([...comments, newComment]);
    setNewComment('');
  };

  const handleKeyPressComment = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handlePostComment();
    }
  };

  const formatDate = (date) => {
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    return new Date(date).toLocaleDateString('it-IT', options);
  };

  const handleTitleClick = () => {
    setIsEditingTitle(true);
  };

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
  };

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
  };

  const handleCommentChange = (e) => {
    const value = e.target.value;
    setNewComment(value);

    if (value.includes('@')) {
      setTagging(true);
    } else {
      setTagging(false);
    }
  };

  const handleTagClick = (user) => {
    setNewComment(newComment + user);
    setTagging(false);
  };


  return (
    <div className="log-chat">
      <div className="header">
        {isEditingTitle ? (
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            onBlur={handleTitleBlur}
            autoFocus
          />
        ) : (
          <h3 onClick={handleTitleClick}>{title}</h3>
        )}
        <h3 className="date">{formatDate(date)}</h3>
      </div>
      <TextArea key={date.toISOString()} onSave={handlePostLog} date={date} />
      <MessageWrapper comments={comments} commentors={commentors} />
      <div className="new-comment">
        <input
          type="text"
          value={newComment}
          onChange={handleCommentChange}
          onKeyPress={handleKeyPressComment}
          placeholder="Write a comment..."
        />
        <button onClick={handlePostComment}>Post</button>
        <button onClick={() => handleInference(date)}>AI</button>
        {tagging && (
          <div className="tagging-menu">
            {users.map((user, index) => (
              <div key={index} onClick={() => handleTagClick(user)}>
                {user}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LogChat;
