import React, { useState } from 'react';
import LogChat from './LogChat';
import './Calendar.css';
import axios from 'axios';

const normalizeDateToUTC = (date) => {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[0];
};


const Calendar = ({ users = [] }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)));
  };

  const renderDays = () => {
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
    const days = [];

    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="day empty"></div>);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
      days.push(
        <div
          key={i}
          className={`day ${selectedDate && selectedDate.toDateString() === dayDate.toDateString() ? 'selected' : ''}`}
          onClick={() => handleDayClick(dayDate)}
        >
          {i}
        </div>
      );
    }

    return days;
  };

  const handleDayClick = async (date) => {
    const normalizedDate = normalizeDateToUTC(date); // Usa la data normalizzata
    setSelectedDate(date);
    await createNewLogPost(date);
  };

  const checkLogPostExists = async (date) => {
    try {
      const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
      const response = await axios.get(`http://localhost:3000/api/logposts/date/${localDate.toISOString().split('T')[0]}`);
      return response.data.length > 0;
    } catch (error) {
      console.error('Error checking log post existence:', error);
      return false;
    }
  };

  const createNewLogPost = async (date) => {
    const exists = await checkLogPostExists(date);
    if (!exists) {
      try {
        // Aggiungi l'offset del fuso orario locale
        const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
        const response = await axios.post('http://localhost:3000/api/logposts', {
          title: 'Titolo',
          content: '{}',
          date: localDate.toISOString().split('T')[0]
        });
        console.log('New log post created:', response.data);
      } catch (error) {
        console.error('Error creating new log post:', error);
      }
    } else {
      console.log('Log post already exists for this date.');
    }
  };
  

  return (
    <div className="calendar-container">
      <div className="calendar">
        <div className="header">
          <button onClick={handlePrevMonth}>Prev</button>
          <h3>{currentDate.toLocaleString('default', { month: 'long' })} {currentDate.getFullYear()}</h3>
          <button onClick={handleNextMonth}>Next</button>
        </div>
        <div className="daysOfWeek">
          {daysOfWeek.map(day => <div key={day} className="dayOfWeek">{day}</div>)}
        </div>
        <div className="days">
          {renderDays()}
        </div>
      </div>
      {selectedDate && <LogChat date={selectedDate} users={users}/>}
    </div>
  );
};

export default Calendar;
