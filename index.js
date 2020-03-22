'use strict'

const moment = require('moment')
const request=require('request')
const csv=require('csvtojson')
const db = require('quick.db')

class Covid19 {

    async getData(date) {
        let data = {}
        if (date != null) {
            date = moment(date).format('MM-DD-YYYY')
            data = await this.fetchData(date)
        } else {
            date = moment().format('MM-DD-YYYY')
            data = await this.fetchData(date)
        }
        return data
    }

    async geTimeSeriesData(type) {

      var data = {}
      let date = moment().format('MM-DD-YYYY')
      type = type.toLowerCase()
      //console.log(`Fetching data from: ${type}`)
      data = await db.fetch(type)
      if(data === null){
        //console.log(`LOCAL data from ${type} not found...attempting to fetch REMOTE data from ${date}`)
        await this.addRemoteTimesSeries(type)
        data = await db.fetch(type)
      } else {
        if (data.lastUpdated !== date){
          //console.log(`LOCAL data from ${type} is not up to date...attempting to fetch latest REMOTE`)
          await this.addRemoteTimesSeries(type)
          data = await db.fetch(type)
        }
      }
      return data

    }

    async fetchData(date) {
        var data = {}
        //console.log(`Fetching data from: ${date}`)
        data = await db.fetch(date)
        while (data === null &&  moment(date, 'MM-DD-YYYY') >= moment('01-22-2020', 'MM-DD-YYYY') ) {
          //console.log(`LOCAL data from ${date} not found...attempting to fetch REMOTE data from ${date}`)
          await this.addRemoteDailyReports(date)
          data = await db.fetch(date)
          if (data == null) {
            //console.log(`REMOTE data from ${date} not found...attempting to fetch LOCAL data from one day before.`)
            date = moment(date, 'MM-DD-YYYY').subtract(1, 'days').format('MM-DD-YYYY')
            data = await db.fetch(date)
            if (data === null) {
              //console.log(`LOCAL data from ${date} not found...attempting to fetch REMOTE data from one day before.`)
              await this.addRemoteDailyReports(date)
              data = await db.fetch(date)
            }
          } 
        }
        if (data === null){
          data = {'error':'Data not found. Plase try again.'}
        }
        return data
      }

      async addRemoteDailyReports(date) {
        let locations = []
        await csv()
        .fromStream(request.get(`https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_daily_reports/${date}.csv`))
        .subscribe(async (json) => {
          return new Promise((resolve,reject) => {
            var obj = {
              country: json['Country/Region'] || '',
              state: json['Province/State'] || '',
              lat: json['Latitude'] || '0.0',
              lon: json['Longitude'] || '0.0', 
              lastUpdate: json['Last Update'] || '',
              confirmed: parseInt(json['Confirmed']) || 0,
              deaths: parseInt(json['Deaths']) || 0,
              recovered: parseInt(json['Recovered']) || 0
            }
            locations.push(obj)
            resolve()
          })
        })
        .then(async (json) => { 
          if (locations.length > 0){
            let countries = await this.groupBy("country", locations, date)
            await db.delete(date)
            await db.set(date, countries)
          }
        })
      }

      async groupBy(key, array, date) { 
        var json = {}
        var result = []
        var totalConfirmed = 0
        var totalRecovered = 0
        var totalDeaths = 0
      
        var allConfirmed = 0
        var allRecovered = 0
        var allDeaths = 0
      
        json.countries = result
      
      
        for (var i = 0; i < array.length; i++) {
          var added = false
          totalConfirmed = 0
          totalRecovered = 0
          totalDeaths = 0
      
          allConfirmed += parseInt(array[i].confirmed)
          allRecovered += parseInt(array[i].recovered)
          allDeaths += parseInt(array[i].deaths)
      
      
          // adds the reset of the locations for the country
          for (var j = 0; j < result.length; j++) {
            if (result[j][key] == array[i][key]) {
      
              totalConfirmed += parseInt(array[i].confirmed)
              result[j].confirmed = totalConfirmed + parseInt(result[j].confirmed)
      
              totalRecovered += parseInt(array[i].recovered)
              result[j].recovered = totalRecovered + parseInt(result[j].recovered)
      
              totalDeaths += parseInt(array[i].deaths)
              result[j].deaths = totalDeaths + parseInt(result[j].deaths)
              
              result[j].locations.push(array[i])
              added = true
              break
            }
          }
          // adds the first location for the country
          if (!added) {
            totalConfirmed = 0
            totalRecovered = 0
            totalDeaths = 0
            var entry = {locations: []}
      
            totalConfirmed += parseInt(array[i].confirmed)
            entry['confirmed'] = totalConfirmed
      
            totalRecovered += parseInt(array[i].recovered)
            entry['recovered'] = totalRecovered
      
            totalDeaths += parseInt(array[i].deaths)
            entry['deaths'] = totalDeaths
      
            entry[key] = array[i][key]
            entry['lat'] = array[i]['lat']
            entry['lon'] = array[i]['lon']
      
            entry.locations.push(array[i])
            result.push(entry)
          }
      
        }
      
        json.date = date
        json.confirmed = allConfirmed
        json.recovered = allRecovered
        json.deaths = allDeaths
      
        return json
      }


      async addRemoteTimesSeries(type) {
        var countries = []
        let min = moment('2020-01-22')
        let max = moment()
        let initCapType = type.charAt(0).toUpperCase() + type.slice(1)
        await  csv()
        .fromStream(request.get(`https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-${initCapType}.csv`))
        .subscribe(async (json) => {
          return new Promise((resolve,reject) => {
            var location = {
              country: json['Country/Region'] || '',
              state: json['Province/State'] || '',
              lat: json['Lat'] || '0.0',
              lon: json['Long'] || '0.0', 
            }
            let dates = []
            for (var m = moment(min); m.diff(max, 'days') <= 0; m.add(1, 'days')) {
              let date = m.format('M/D/YY')
              if (json[date] != null){
                let value = parseInt(json[date]) || 0
                let dateObj = {
                  [m.format('MM-DD-YYYY')]: value
                }
                dates.push(dateObj)
              }
            }

            if (dates.length > 0){
              let lastDate = dates[dates.length-1]
              location.total = Object.values(lastDate)[0]
            }

            location.dates = dates
            countries.push(location)
            resolve()
          })
        })        
        .then(async (json) => { 
          if (countries.length > 0){
            countries = await this.groupByTimesSeries('country', countries)
            db.delete(type)
            db.set(type, countries)
          }
        })

      }

      async groupByTimesSeries(key, array) { 
        let root = {}
        var locations = []
        var grandTotal = 0

        root.countries = locations
    
        for (var i = 0; i < array.length; i++) {
          var total = 0
          var added = false
          // adds the reset of the locations for the country
          for (var j = 0; j < locations.length; j++) {
            if (locations[j][key] == array[i][key]) {
              total += parseInt(array[i].total) || 0
              locations[j].locations.push(array[i])
              added = true
              break
            }
          }
          // adds the first location for the country
          if (!added) {
            var entry = {locations: []}       
            entry[key] = array[i][key]
            entry['lat'] = array[i]['lat']
            entry['lon'] = array[i]['lon']
            total += parseInt(array[i]['total']) || 0
            entry.locations.push(array[i])
            locations.push(entry)
          }

          locations[j].total = total
          grandTotal += total
        }
      
        root.lastUpdated = moment().format('MM-DD-YYYY')
        root.total = grandTotal
        return root
      }      
}

module.exports = Covid19