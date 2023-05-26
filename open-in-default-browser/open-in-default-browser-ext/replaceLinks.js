setInterval(changeLinks, 1000)

// This allows you to call the function even later if needed
function changeLinks() {
  // Get list of all links in the page
  var links = document.getElementsByTagName("a"); 
  // Loop through links
  for(var i=0,l=links.length; i<l; i++) {
     // No need to use `getAttribute`, href is defined getter in all browsers
     loc = links[i].href;
     console.log(links[i].href.substring(0, 8));
     if (links[i].href.substring(0, 8) == "https://" && !links[i].href.includes("discord.com")){
        links[i].href = "open:" + links[i].href;
        console.log(links[i].href);
     }
  }
}
