const express = require("express")
const app = express()
const Covid19 = require('../index.js')
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
