### Setlist Options
![](https://github.com/sandiz/rs-manager/raw/master/screenshots/images/custom.setlist.filterone.jpg)

#### Field: Name
 - name of playlist

#### Field: Type
 - Manual - add songs manually
 - Generated - add songs via filters

#### Generated Setlist: Filters
 - Filter Type
   * Supported filters
       * Artist / Song / Album: any string 
       * Arrangement: expected: ["lead", "rhythm", "bass", "combo"]
       * Mastery: expected: 0-100
       * Difficulty: expected: 0-100
       * LAS/SA Playcount: expected: 0-any
       * Tempo: expected: 0-any
       * CDLC: expected: true/false
       * Tuning: custom dropdown options
       * A440: expected: true/false
       * Capo: expected: true/false
       * SA Easy/Medium/Hard/Master: custom dropdown options
       * FC Easy/Medium/Hard/Master: expected true/false
 - Comparator:
    * (>=, <=, >, <, =) - number comparision
    * is/is not - true or false
    * like/not like - string comparision
 - Value
    * -- user input -- goes here 
 - Logic Chain: 
    Use and/or logic to connect filters
 - Delete:
    Delete the filter
 - Test Query:
    Runs the query and returns count of results. query was successful if count is > 0, the query has errors if count = -1

    