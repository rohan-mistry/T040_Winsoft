import { Button, Container, FormControl, Grid, InputLabel, makeStyles, MenuItem, Select, TextField, Typography } from '@material-ui/core'
import React, { useEffect, useState } from 'react'
import MainNav from '../components/MainNav'
import { encrypted } from '../config'
import BarGraph from './BarGraph'
import Positions from './Positions'


const useStyles = makeStyles(() => ({
  content:{
    marginTop:10,
    
  },
  gmap:{
    marginTop:20,
    marginBottom:20
  },
  heading:{
    fontWeight: 700,
    marginBottom: 10
  },
  buttonRight:{
    display:'flex',
    justifyContent:'flex-end',
    marginTop:20,
    marginBottom:20
  }
}))

function Home() {
  const classes = useStyles();
  const [keyVal, setKeyVal] = useState('');
  const [encryptedMess, setencryptedMess] = useState('');
  const [decrypted, setdecrypted] = useState(null);
  const [enemyLocations, setenemyLocations] = useState(null);
  const [desired_location, setdesired_location] = useState(null);
  const [gmarkers, setgmarkers] = useState(null);
  const [mapData, setmapData] = useState(null);
  const [barGraph, setbarGraph] = useState(null);
  const [mapOptions, setmapOptions] = useState([]);
  const [selectedMap, setselectedMap] = useState('')

  const decrypt = async() => {
    if(encryptedMess === "" || keyVal === "" || setselectedMap===''){
      alert("Enter all the three fields")
      return
    }
    const postData = JSON.stringify({
      key: keyVal,
      encrypted_message: encryptedMess,
      all_camp_names: Object.keys(mapData)
    })
    var requestOptions = {
      method: 'POST',
      headers: {
        'Content-type': 'application/json',
        'Authorization': 'Bearer ' + localStorage.getItem('auth-token')
      },
      body: postData
    };
    const data = await fetch("/api/decryption/",requestOptions)
    const result = await data.json();
    setdecrypted(result && result.decrypted_message);
    setenemyLocations(result && result.enemy_camps)
  }

  const getLocation = async() => {
    let mapped = mapData;
    Object.keys(mapped).forEach(node => {
      if(enemyLocations.includes(node)) {
        mapped[node].enemy=true;
      } else {
        mapped[node].enemy=false;
      }
    })
    const postData = JSON.stringify({
      enemies:enemyLocations,
      map:mapped
    })
    var requestOptions = {
      method: 'POST',
      headers: {
        'Content-type': 'application/json',
        'Authorization': 'Bearer ' + localStorage.getItem('auth-token')
      },
      body: postData
    };
    const data = await fetch("/api/map/get-desired-location",requestOptions)
    const result = await data.json();
    if(result && result.desired_location) {
      setbarGraph(result.all_edges);
      let postData = JSON.stringify({
        decrypted,
        desired_location:result.desired_location,
        timestamp:Date.now()
      })
      let requestOptions = {
        method: 'POST',
        headers: {
          'Content-type': 'application/json',
          'Authorization': 'Bearer ' + localStorage.getItem('auth-token')
        },
        body: postData
      };
      let data_h = await fetch("/api/decryption/history",requestOptions)
      let result_h = await data_h.json();
      setdesired_location(result.desired_location);
      let markers = [{
        name:result.desired_location,
        coordinates:mapData[result.desired_location]["real_life_coordinates"],
        enemy:false
      }]
      enemyLocations.forEach(loc => {
        markers.push({
          name:loc,
          coordinates:mapData[loc].real_life_coordinates,
          enemy:true,
        })
      })
      setgmarkers(markers);
      
      mapped[result.desired_location].desirable = true;
      fillCanvas(mapped);
    }
    
  }
  
  useEffect(() => {
    const collect = async() => {
      const result = await fetch("/api/map/",{
        method:"GET",
        headers: {
          'Content-type': 'application/json',
          'Authorization': 'Bearer ' + localStorage.getItem('auth-token')
        }
      })
      const data =await result.json();
      console.log(data);
      setmapOptions(data.map_details)
    }
    collect();
  }, [])

  const changeMap = async(mapId) => {
    if (mapId=='') return;
    setselectedMap(mapId);
    const result = await fetch(`/api/map/single/${mapId}`,{
      method:"GET",
      headers: {
        'Content-type': 'application/json',
        'Authorization': 'Bearer ' + localStorage.getItem('auth-token')
      }
    })
    const data =await result.json();
    setmapData(data.data.map);
    fillCanvas(data.data.map);
  }

  const fillCanvas= (canvasmapdata) => {
    const canvas = document.getElementById("canvas");
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, 600, 300);
    let mapped = canvasmapdata;
    const offset =25;
    // Create a custom fillText funciton that flips the canvas, draws the text, and then flips it back
    context.fillText = function(text, x, y) {
      this.save();       // Save the current canvas state
      this.scale(1, -1); // Flip to draw the text
      this.fillStyle="black";
      this.fillText.dummyCtx.fillText.call(this, text+ `(${(x-offset)/10},${(y-offset+20)/10})`, x, -y); // Draw the text, invert y to get coordinate right
      this.restore();    // Restore the initial canvas state
    }
    context.fillText.dummyCtx = document.createElement('canvas').getContext('2d');
    Object.keys(mapped).forEach(node => {
      context.beginPath();
      context.font = "10px Arial";
      context.fillText(node, (mapped[node].coordinates[0]*10)+offset,(mapped[node].coordinates[1]*10)+offset -20);
      
      context.arc((mapped[node].coordinates[0]*10)+offset, (mapped[node].coordinates[1]*10)+offset, 10, 0, 2 * Math.PI);
      if(mapped[node].enemy) {
        context.fillStyle = "red";
      } else if(mapped[node].desirable) {
        context.fillStyle = "green";
      } else {
        context.fillStyle = "blue";
      }
      
      context.fill();
      mapped[node].neighbours.map(ng => {
        context.moveTo((mapped[node].coordinates[0]*10)+offset,(mapped[node].coordinates[1]*10)+offset);
        context.lineTo((mapped[ng].coordinates[0]*10)+offset, (mapped[ng].coordinates[1]*10)+offset);
        context.stroke();
      })
      context.stroke();
    })
    

  }

  return (
    <div>
      <MainNav/>
      <Container maxWidth="md">
        <div className={classes.content}>
          <Typography align="center" variant="h5" component="div" className={classes.heading}>
            Enter Details
          </Typography>
          <Grid container spacing={4}>
            <Grid item ms={12} xs={12}>
              <FormControl variant="outlined" style={{width:'100%'}}>
                <InputLabel id="demo-simple-select-outlined-label">Select Map</InputLabel>
                <Select
                  labelId="demo-simple-select-outlined-label"
                  id="demo-simple-select-outlined"
                  value={selectedMap}
                  fullWidth
                  onChange={e => changeMap(e.target.value)}
                  label="Select Map"
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {mapOptions.map((temp,index) => 
                    <MenuItem key={`map${index}`} value={temp._id}>{temp.title}</MenuItem>
                  )}
                </Select>
              </FormControl>
            </Grid>
            <Grid item md={12} xs={12}>
              <TextField 
              id="outlined-basic" 
              label="Enter Key" 
              variant="outlined"
              value={keyVal}
              fullWidth
              onChange={e => setKeyVal(e.target.value)} 
              />
            </Grid>
            <Grid item md={12} xs={12}>
            
              <TextField 
                id="outlined-basic" 
                label="Enter encrypted Message" 
                variant="outlined"
                fullWidth
                multiline
                rows="6"
                value={encryptedMess}
                onChange={e => setencryptedMess(e.target.value)} 
                />
              
            </Grid>
            <Grid item md={12} xs={12} container direction="row" justify="flex-end">
              <Button  
                variant="contained"  
                color="primary"
                onClick={decrypt}
                >
                Decrypt
              </Button>
            </Grid>
            <Grid item md={12} xs={12}>
              {decrypted ? <>
                 <strong>Decrypted Message</strong> : {decrypted}
              </>:null}
            </Grid>
            <Grid item md={12} xs={12}>
              {
                enemyLocations?enemyLocations.length?<>
                <strong>Enemy locations found at :</strong> {enemyLocations.join()}
                <div className={classes.buttonRight}>
                  <Button
                    color="primary"
                    variant="outlined"
                    onClick={getLocation}
                  >
                    Get Desirable Position
                  </Button>
                </div>
                </>:'No Enemy Locations Found':null
              }
              
            </Grid>
            <Grid item md={12} xs={12}>
              {desired_location ? <>
                 <strong>Desired Position</strong> : {desired_location}
              </>:null}
            </Grid>
          </Grid>
          <Grid container spacing ={2}>
            <Grid item xs={12} md={12} classname={classes.graph}>
              <div style={{transform: 'scaleY(-1)',textAlign:'center',overflowX:'auto'}}>
                <canvas id="canvas" width="600" height="300" ></canvas>
              </div>
            </Grid>
            <Grid item xs={12} md={12} className={classes.gmap}>
              { gmarkers && 
                <Positions markers={gmarkers}/>
              }
            </Grid>
            <Grid container justify="center" item xs={12} md={12}>
              {barGraph && <BarGraph edges={barGraph}/> }
            </Grid>
          </Grid>
        </div>
      </Container>
    </div>
  )
}

export default Home
