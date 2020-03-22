# covid19-json
A JSON datasource for COVID-19 using Johns Hopkins CSSE CSV Data.

This package uses quick.db, which is an easy to use database wrapper for better-sqlite3, to cache and transform data to JSON from https://github.com/CSSEGISandData/COVID-19. The package will automatically check if it has the latest data.

Data is grouped by country, location, and dates.

## Usage
```
const Covid19 = require('covid-19')
const covid19 = new Covid19()

// Get latest daily report
let data = await covid19.getData()

// Get specific day report (starting from 01-22-2020)
let data = await covid19.getData('MM-DD-2020')

// Get time series ('confirmed', 'recovered', 'deaths')
let data = await covid19.geTimeSeriesData('confirmed')
```

## Use wih Express
```
const express = require("express")
const app = express()
const Covid19 = require('covid-19')
const covid19 = new Covid19()
const port = 9898

app.get("/covid19/confirmed", async function(req, res) {
  let data = await covid19.geTimeSeriesData('confirmed')
  res.send(data)
})

app.get("/covid19/recovered", async function(req, res) {
  let data = await covid19.geTimeSeriesData('recovered')
  res.send(data)
})

app.get("/covid19/deaths", async function(req, res) {
  let data = await covid19.geTimeSeriesData('deaths')
  res.send(data)
})

app.get("/covid19/:date?", async function(req, res) {
  let data = await covid19.getData(req.params.date)
  res.send(data)
})

let listener = app.listen(port, function() {
console.log("Your app is listening on port " + listener.address().port);
})

```
