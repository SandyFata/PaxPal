import React, { useEffect, useState } from 'react';
import Papa from 'papaparse';
import Calendar from 'react-calendar';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Button, Dropdown, DropdownButton } from 'react-bootstrap';
import Header from '../components/Header';

function Graphs({ csvData }) {
  const [glucoseData, setGlucoseData] = useState([]);
  const [selectedDate, setSelectedDate] = useState('2023-08-25');
  const [dateList, setDateList] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(new Date());

  const handleCalendarClick = () => {
    setShowCalendar(!showCalendar);
  };

  const handleDateSelection = (date) => {
    const formattedDate = date.toISOString().split('T')[0];
    setSelectedDate(formattedDate);
    setShowCalendar(false);
  };

  const handleDailyReportsClick = () => {
    setShowCalendar(true);
  };

  const monthList = [
    'January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'
  ];

  const handleMonthSelection = (selectedMonth) => {
    const monthNameToNumber = {
      'January': '01',
      'February': '02',
      'March': '03',
      'April': '04',
      'May': '05',
      'June': '06',
      'July': '07',
      'August': '08',
      'September': '09',
      'October': '10',
      'November': '11',
      'December': '12',
    };

    const selectedMonthNumber = monthNameToNumber[selectedMonth];

    if (csvData && Array.isArray(csvData.data)) {
      const selectedMonthData = csvData.data.filter((row) => {
        const timestamp = row['Timestamp (YYYY-MM-DDThh:mm:ss)'];
        const month = timestamp.split('-')[1];
        return month === selectedMonthNumber;
      });

      if (selectedMonthData.length > 0) {
        const extractedMonthData = selectedMonthData.map((row) => {
          return {
            timestamp: row['Timestamp (YYYY-MM-DDThh:mm:ss)'],
            date: row['Timestamp (YYYY-MM-DD hh:mm:ss)'].split(' ')[0],
            glucoseValue: parseFloat(row['Glucose Value (mg/dL)']),
          };
        });
        setGlucoseData(extractedMonthData);
      } else {
        setGlucoseData([]);
      }
    }
  };

  useEffect(() => {
    if (csvData && csvData.data) {
      Papa.parse(csvData.data, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (result) => {
          if (result.data) {
            const selectedDateData = result.data.filter((row) => {
              const timestamp = row['Timestamp (YYYY-MM-DDThh:mm:ss)'];
              return timestamp?.startsWith(selectedDate);
            });
            if (selectedDateData.length === 0) {
              setGlucoseData([]);
            } else {
              const extractedData = selectedDateData.map((row) => {
                const timestamp = row['Timestamp (YYYY-MM-DDThh:mm:ss)'];
                const dateParts = timestamp.split(' ');
                return {
                  date: dateParts[0],
                  time: dateParts[1],
                  glucoseValue: parseFloat(row['Glucose Value (mg/dL)']),
                };
              });
              setGlucoseData(extractedData);
            }
          }
        },
      });
    }
  }, [csvData, selectedDate]);

  return (
    <div>
      <h1>Glucose Level Over Time</h1>
      <h2>Data Displaying For: {selectedMonth || selectedDate}</h2>

      <div className="graph-button"style={{ display: 'flex', alignItems: 'center', marginBottom: '10px', marginLeft: '46%' }}>
        <Button
          variant="primary"
          style={{ marginRight: '10px' }}
          onClick={handleDailyReportsClick}
        >
          Daily Reports
        </Button>

        
      </div>

      {showCalendar && (
        <Calendar onChange={handleDateSelection} value={new Date(selectedDate)} />
      )}

      {selectedMonth ? (
        glucoseData.length === 0 ? (
          <p>Data doesn't exist for the chosen month</p>
        ) : (
          <LineChart width={800} height={400} data={glucoseData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="timestamp" />
            <YAxis dataKey="glucoseValue" />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="glucoseValue"
              activeDot={{ r: 8 }}
              stroke={{
                base: '#8884d8',
                value: (value) => {
                  if (value < 70 || value > 200) {
                    return 'red';
                  }
                  return '#8884d8';
                },
              }}
            />
          </LineChart>
        )
      ) : (
        glucoseData.length === 0 ? (
          <p>Data doesn't exist for the chosen date</p>
        ) : (
          <LineChart width={800} height={400} data={glucoseData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis dataKey="glucoseValue" />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="glucoseValue" stroke="#8884d8" activeDot={{ r: 8 }} />
          </LineChart>
        )
      )}
    </div>
  );
}

export default Graphs;
