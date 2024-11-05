import React, { useEffect, useRef, useState } from 'react';
import EditorJS from '@editorjs/editorjs';
import Header from '@editorjs/header';
import List from '@editorjs/list';
import './TextArea.css';
import axios from 'axios';
import debounce from 'lodash.debounce';

const TextArea = ({ onSave, date }) => {
  const editorInstance = useRef(null);
  const [savedData, setSavedData] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const editorElement = document.getElementById('editorjs');

    const fetchLogPost = async () => {
      try {
        const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
        const response = await axios.get(`http://localhost:3000/api/logposts/date/${localDate.toISOString().split('T')[0]}`);
        setSavedData(response.data[0]);
        return response.data[0]?.content || '{}';
      } catch (error) {
        console.error('Error fetching data:', error);
        return '{}';
      }
    };

    const initializeEditor = async () => {
      const data = await fetchLogPost();
      if (editorElement) {
        if (editorInstance.current) {
          editorInstance.current.destroy();
        }
        editorInstance.current = new EditorJS({
          holder: 'editorjs',
          tools: {
            header: {
              class: Header,
              inlineToolbar: ['link'],
            },
            list: {
              class: List,
              inlineToolbar: true,
            },
          },
          data: JSON.parse(data),
          onChange: debounce(handleInputChange, 1000),
        });
      }
    };

    initializeEditor();

    return () => {
      if (editorInstance.current) {
        editorInstance.current.destroy();
        editorInstance.current = null;
      }
    };
  }, [date]);

  const handleInputChange = async () => {
    if (!isSaving && editorInstance.current) {
      setIsSaving(true);
      try {
        const outputData = await editorInstance.current.save();
        
        const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
        const formattedDate = localDate.toISOString().split('T')[0];
        
        await axios.put(`http://localhost:3000/api/logposts/date/${formattedDate}`, {
          content: JSON.stringify(outputData),
        });
        
        setSavedData({ ...savedData, content: JSON.stringify(outputData) });
        onSave(outputData);
      } catch (error) {
        console.error('Error saving data:', error);
      } finally {
        setIsSaving(false);
      }
    }
  };
  
  return (
    <div>
      <div id="editorjs" className="log-textarea"></div>
    </div>
  );
};

export default TextArea;