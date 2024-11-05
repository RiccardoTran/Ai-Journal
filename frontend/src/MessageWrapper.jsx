import React from 'react';
import './MessageWrapper.css';

const MessageWrapper = ({ comments, commentors }) => {
  return (
    <div className="comments-wrapper">
      <div className="comments">
        {comments.map((comment, index) => (
          <div key={index} className="comment">
            <span className="commentor">{commentors[index] || "Anonymous"} </span>
            <span className="comment-text">
              {typeof comment === 'string' ? comment : JSON.stringify(comment)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MessageWrapper;
