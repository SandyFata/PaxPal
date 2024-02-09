import React, { useRef } from 'react';
import Papa from 'papaparse';
import AlgorithmPage from './AlgorithmPage';
function CSVFileUploader({ onFileUploaded }) {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFiles = e.target.files;

    // Iterate over the selected files and parse each one
    for (const file of selectedFiles) {
      const fileReader = new FileReader();
      fileReader.onload = function (event) {
        const text = event.target.result;
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          complete: function (results) {
            const parsedData = results.data;
            const csvData = { fileName: file.name, data: text, parsedData };
            onFileUploaded(csvData); // Notify the parent component
          },
        });
      };
      fileReader.readAsText(file);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current.click(); // Trigger file input click
  };

  return (
    <div>
      <input
        type="file"
        id="csvFileInput"
        accept=".csv"
        multiple // Allow multiple file selection
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <button
        onClick={handleButtonClick} 
        style={{
          background: 'linear-gradient(#91bfdc, #1464a1)',
          color: 'white',
          padding: '10px',
          borderRadius: '8px',
          cursor: 'pointer',
        }}
      >
        Upload CSV File
      </button>
    </div>
  );
}

export default CSVFileUploader;
