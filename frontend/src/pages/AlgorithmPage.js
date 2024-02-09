import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { getMeals } from '../features/meals/mealSlice';
import { useDispatch, useSelector } from 'react-redux';


function AlgorithmPage({ csvData }) {
  const dispatch = useDispatch();
  // Fetch meal data from Redux state
  const mealData = useSelector((state) => state.meals.meals);

  useEffect(() => {
    dispatch(getMeals());
  }, [dispatch]);

  const [results, setResults] = useState([]);
  const [lowHourlyTrends, setLowHourlyTrends] = useState(new Map());
  const [highHourlyTrends, setHighHourlyTrends] = useState(new Map());
  const [insulinDosageTime, setInsulinDosageTime] = useState('');
  //const [suggestions, setSuggestions] = useState('');
  const [mealTimeSuggestionsList, setMealTimeSuggestionsList] = useState([]);
  const [suggestionsList, setSuggestionsList] = useState([]);
  const [successfulMealTime, setSuccessfulMealTime] = useState('');
  const [unsuccessfulMealTime, setUnsuccessfulMealTime] = useState('');
  const [bslUpperBound, setBslUpperBound] = useState(200);
  const [bslLowerBound, setBslLowerBound] = useState(80);
  const [parsedData, setParsedData] = useState([]);


  const processCSVData = (data) => {
    if (data) {
      // Parse the CSV data and extract relevant information
      const parsedData = Papa.parse(data, { header: true }).data;
  
      
  
      // Enrich glucoseData with meal information
      const enrichedData = parsedData.map((row) => {
        const timestamp = row['Timestamp (YYYY-MM-DDThh:mm:ss)'];
        const glucoseValue = parseFloat(row['Glucose Value (mg/dL)']);
        const matchingMeal = mealData.find((meal) => meal.timestamp === timestamp);

  
        return {
          timestamp,
          glucoseValue,
          mealName: matchingMeal?.mealName || '',
          mealDate: matchingMeal?.mealDate || '',
          mealTime: matchingMeal?.mealTime || '',
          insulinDosage: matchingMeal?.insulinDosage || 0,
          insulinTime: matchingMeal?.insulinTime || '',
          carbCount: matchingMeal?.carbCount || 0,
        };
      });
      
      

      
      // Arrays to store low and high matching events
      const lowMatchingEvents = [];
      const highMatchingEvents = [];
  
      // Iterate through the enriched glucose data and check for low and high blood sugar events
      enrichedData.forEach((entry) => {
        if (!isNaN(entry.glucoseValue)) {
          if (entry.glucoseValue > bslUpperBound) {
            highMatchingEvents.push(`High blood sugar event at time ${entry.timestamp}`);
            flagHighHourlyTrend(entry.timestamp);
          } else if (entry.glucoseValue < bslLowerBound) {
            lowMatchingEvents.push(`Low blood sugar event at time ${entry.timestamp}`);
            flagLowHourlyTrend(entry.timestamp);
          }
        }
  
        // Call handleSuggestions for each entry
        handleSuggestions(entry);
      });
  
      // Update the results with matching events
      setResults([...lowMatchingEvents, ...highMatchingEvents]);
  
      // Set the parsed data for further use
      setParsedData(enrichedData);
    }
  };
  

  const flagLowHourlyTrend = (timestamp) => {
    const date = new Date(timestamp);
    const hour = date.getHours();
    const newTrends = new Map(lowHourlyTrends);
    newTrends.set(hour, (newTrends.get(hour) || 0) + 1);
    setLowHourlyTrends(newTrends);
  };

  const flagHighHourlyTrend = (timestamp) => {
    const date = new Date(timestamp);
    const hour = date.getHours();
    const newTrends = new Map(highHourlyTrends);
    newTrends.set(hour, (newTrends.get(hour) || 0) + 1);
    setHighHourlyTrends(newTrends);
  };

  const handleSuggestions = (entry) => {
    const { timestamp, glucoseValue, entryMealName, mealDate, entryMealTime, entryInsulinDosage, insulinDosageTime, entryCarbCount } = entry;
    const insulinTime = new Date(insulinDosageTime);
    const insulinHour = insulinTime.getHours();
    const checkStartTime = new Date(insulinTime);
    checkStartTime.setHours(insulinHour - 3);
    const checkEndTime = new Date(insulinTime);
    checkEndTime.setHours(insulinHour + 3);

    let successful = true;
    let mealTimeSuggestions = [];
    let suggestions = [];
    let insulinStackingWarnings = [];

    const time = new Date(timestamp);

    if (time >= checkStartTime && time <= checkEndTime) {
        if (glucoseValue > bslUpperBound || glucoseValue < bslLowerBound) {
            successful = false;

            const tenMinsAfterInsulin = new Date(insulinTime);
            tenMinsAfterInsulin.setMinutes(insulinTime.getMinutes() + 10);

            if (entryMealTime && new Date(entryMealTime) >= tenMinsAfterInsulin && new Date(entryMealTime) <= insulinTime) {
                mealTimeSuggestions.push(`Unsuccessful Meal Time at ${entryMealTime}`);
                setUnsuccessfulMealTime(entryMealTime);
            }

            if (glucoseValue > bslUpperBound) {
                suggestions.push(`High Event Occurred, consider ${entryMealName} having more carbs than accounted for ${entryCarbCount} or increasing insulin to carb ratio`);
            } else if (glucoseValue < bslLowerBound) {
                suggestions.push(`Low Event Occurred, consider ${entryMealName} having less carbs than accounted for ${entryCarbCount} or increasing insulin to carb ratio`);
            }

            if (glucoseValue < bslLowerBound && time !== insulinDosageTime) {
                const olderInsulinDosageTime = new Date(insulinDosageTime);
                olderInsulinDosageTime.setHours(insulinHour - 3); // Assuming insulin can last up to 3 hours
                if (time >= olderInsulinDosageTime && time <= insulinDosageTime) {
                    insulinStackingWarnings.push(`Insulin stacking warning. Low event detected after Insulin was administered at ${insulinDosageTime}  ${entryInsulinDosage}. Insulin was also administered at ${time} ${entryInsulinDosage}`);
                }
            }
        }
    }

    if (successful) {
        setSuccessfulMealTime(insulinDosageTime);
        setMealTimeSuggestionsList(mealTimeSuggestions);
    }
    setSuggestionsList(suggestions);
};


  useEffect(() => {
    processCSVData(csvData.data);
  }, [csvData]);


  return (
    <div>
      <div>
        <h2>Low Hourly Trends</h2>
        <ul>
          {[...lowHourlyTrends.entries()]
            .filter(([, count]) => count > 1)
            .map(([hour, count], index) => (
              <li key={index}>{`Hour: ${hour}, Occurrences: ${count}`}</li>
            ))}
        </ul>
      </div>
      <div>
        <h2>High Hourly Trends</h2>
        <ul>
          {[...highHourlyTrends.entries()]
            .filter(([, count]) => count > 1)
            .map(([hour, count], index) => (
              <li key={index}>{`Hour: ${hour}, Occurrences: ${count}`}</li>
            ))}
        </ul>
      </div>
      <div>
        <h2>Suggestions</h2>
        <ul>
          {suggestionsList.map((suggestion, index) => (
            <li key={index}>{suggestion}</li>
          ))}
        </ul>
      </div>
      <div>
        <h3>Meal Time</h3>
        <ul>
          {mealTimeSuggestionsList.map((suggestion, index) => (
            <li key={index}>{suggestion}</li>
          ))}
        </ul>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{ marginRight: '20px' }}>
    <h3>Successful Meal Time</h3>
    <p>{successfulMealTime}</p>
  </div>
  <div>
    <h3>Unsuccessful Meal Time</h3>
    <p>{unsuccessfulMealTime}</p>
  </div>
</div>


    </div>
  );
}
export default AlgorithmPage;

/* Commented out html code- uses for future
      <h1>Suggestions Algorithm</h1>
      <div>
        <label>BSL Upper Bound: </label>
        <input type="number" id="upperBound" value={bslUpperBound} onChange={(e) => setBslUpperBound(e.target.value)} />
        <label>BSL Lower Bound: </label>
        <input type="number" id="lowerBound" value={bslLowerBound} onChange={(e) => setBslLowerBound(e.target.value)} />
        <button onClick={handleSuggestions}>Run Algorithm</button>
      </div>
      <div>
        <h2>Results:</h2>
        <ul>
          {results.map((event, index) => (
            <li key={index}>{event}</li>
          ))}
        </ul>
      </div> */
      /*
      <h2>Insulin Dosage and Suggestions:</h2>
        <div>
          <label>Insulin Dosage Time: </label>
          <input type="datetime-local" id="insulinDosageTime" onChange={(e) => setInsulinDosageTime(e.target.value)} />
        </div>
        <div>
          <label>Meal Time: </label>
          <input type="datetime-local" id="mealTime" onChange={(e) => setMealTime(e.target.value)} />
        </div>
        <div>
          <label>Insulin Dosage: </label>
          <input type="text" id="insulinDosage" onChange={(e) => setInsulinDosage(e.target.value)} />
        </div>
        <div>
          <label>Carb Count: </label>
          <input type="text" id="carbCount" onChange={(e) => setCarbCount(e.target.value)} />
        </div>
        <div>
          <label>Meal Name: </label>
          <input type="text" id="mealName" onChange={(e) => setMealName(e.target.value)} />
        </div>
        <button onClick={handleDataEntry}>Add Data</button>
        <div></div> */
 