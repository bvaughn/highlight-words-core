import * as Chunks from './utils.js'
import expect from 'expect.js'
import latinize from 'latinize'

describe('utils', () => {
  // Positions: 01234567890123456789012345678901234567
  const TEXT = 'This is a string with words to search.'

  it('should handle empty or null textToHighlight', () => {
    let result = Chunks.findAll({
      searchWords: ['search'],
      textToHighlight: ''
    })
    expect(result.length).to.equal(0)

    result = Chunks.findAll({
      searchWords: ['search']
    })
    expect(result.length).to.equal(0)
  })

  it('should highlight all occurrences of a word, regardless of capitalization', () => {
    const rawChunks = Chunks.findChunks({
      searchWords: ['th'],
      textToHighlight: TEXT
    })
    expect(rawChunks).to.eql([
      {start: 0, end: 2, highlight: false},
      {start: 19, end: 21, highlight: false}
    ])
  })

  it('should highlight words that partially overlap', () => {
    const combinedChunks = Chunks.combineChunks({
      chunks: Chunks.findChunks({
        searchWords: ['thi', 'is'],
        textToHighlight: TEXT
      })
    })
    expect(combinedChunks).to.eql([
      {start: 0, end: 4, highlight: false},
      {start: 5, end: 7, highlight: false}
    ])
  })

  it('should combine into the minimum number of marked and unmarked chunks', () => {
    const filledInChunks = Chunks.findAll({
      searchWords: ['thi', 'is'],
      textToHighlight: TEXT
    })
    expect(filledInChunks).to.eql([
      {start: 0, end: 4, highlight: true},
      {start: 4, end: 5, highlight: false},
      {start: 5, end: 7, highlight: true},
      {start: 7, end: 38, highlight: false}
    ])
  })

  it('should handle unclosed parentheses when autoEscape prop is truthy', () => {
    const rawChunks = Chunks.findChunks({
      autoEscape: true,
      searchWords: ['text)'],
      textToHighlight: '(This is text)'
    })
    expect(rawChunks).to.eql([
      {start: 9, end: 14, highlight: false}
    ])
  })

  it('should match terms without accents against text with accents', () => {
    const rawChunks = Chunks.findChunks({
      sanitize: latinize,
      searchWords: ['example'],
      textToHighlight: 'ỆᶍǍᶆṔƚÉ'
    })
    expect(rawChunks).to.eql([
      {start: 0, end: 7, highlight: false}
    ])
  })

  it('should support case sensitive matches', () => {
    let rawChunks = Chunks.findChunks({
      caseSensitive: true,
      searchWords: ['t'],
      textToHighlight: TEXT
    })
    expect(rawChunks).to.eql([
      {start: 11, end: 12, highlight: false},
      {start: 19, end: 20, highlight: false},
      {start: 28, end: 29, highlight: false}
    ])

    rawChunks = Chunks.findChunks({
      caseSensitive: true,
      searchWords: ['T'],
      textToHighlight: TEXT
    })
    expect(rawChunks).to.eql([
      {start: 0, end: 1, highlight: false}
    ])
  })

  it('should handle zero-length matches correctly', () => {
    let rawChunks = Chunks.findChunks({
      caseSensitive: true,
      searchWords: ['.*'],
      textToHighlight: TEXT
    })
    expect(rawChunks).to.eql([
        {start: 0, end: 38, highlight: false}
    ])

    rawChunks = Chunks.findChunks({
      caseSensitive: true,
      searchWords: ['w?'],
      textToHighlight: TEXT
    })
    expect(rawChunks).to.eql([
        {start: 17, end: 18, highlight: false},
        {start: 22, end: 23, highlight: false}
    ])
  })

  it('should use custom findChunks', () => {
    let filledInChunks = Chunks.findAll({
      findChunks: () => (
       [{start: 1, end: 3}]
      ),
      searchWords: ['xxx'],
      textToHighlight: TEXT
    })
    expect(filledInChunks).to.eql([
      {start: 0, end: 1, highlight: false},
      {start: 1, end: 3, highlight: true},
      {start: 3, end: 38, highlight: false}
    ])

    filledInChunks = Chunks.findAll({
      findChunks: () => (
       []
      ),
      searchWords: ['This'],
      textToHighlight: TEXT
    })
    expect(filledInChunks).to.eql([
      {start: 0, end: 38, highlight: false}
    ])
  })

  context('when htmlText is not set', () => {
    it('finds chunks in the text and tags', () => {
      let result = Chunks.findAll({
        searchWords: ['strong'],
        textToHighlight: '<p>There is <strong>some strong content</strong> in this paragraph</p>'
      })

      expect(result).to.eql([
        { start: 0, end: 13, highlight: false },
        { start: 13, end: 19, highlight: true },
        { start: 19, end: 25, highlight: false },
        { start: 25, end: 31, highlight: true },
        { start: 31, end: 41, highlight: false },
        { start: 41, end: 47, highlight: true },
        { start: 47, end: 70, highlight: false }
      ])
    })
  })

  context('when htmlText is set to true', () => {
    it('finds chunks in the text', () => {
      let result = Chunks.findAll({
        searchWords: ['content'],
        textToHighlight: '<p>There is some content in this paragraph</p>',
        htmlText: true
      })

      expect(result).to.eql([
        { start: 0, end: 17, highlight: false },
        { start: 17, end: 24, highlight: true },
        { start: 24, end: 46, highlight: false }
      ])
    })

    it('does not find chunks in the tags', () => {
      let result = Chunks.findAll({
        searchWords: ['strong'],
        textToHighlight: '<p>There is <strong>some strong content</strong> in this paragraph</p>',
        htmlText: true
      })

      expect(result).to.eql([
        { start: 0, end: 25, highlight: false },
        { start: 25, end: 31, highlight: true },
        { start: 31, end: 70, highlight: false }
      ])
    })

    it('does not find chunks in the tags metadata', () => {
      let result = Chunks.findAll({
        searchWords: ['strong'],
        textToHighlight: '<p>There is <span class="strong">some strong content</span> in this paragraph</p>',
        htmlText: true
      })

      expect(result).to.eql([
        { start: 0, end: 38, highlight: false },
        { start: 38, end: 44, highlight: true },
        { start: 44, end: 81, highlight: false }
      ])
    })

    it('support weird cases', () => {
      let result = Chunks.findAll({
        searchWords: ['strong'],
        textToHighlight: '<p aria-strong=1>There is <span class="strong">some < not so stong > content</span> in this paragraph</p>',
        htmlText: true
      })

      expect(result).to.eql([
        { start: 0, end: 8, highlight: false },
        { start: 8, end: 14, highlight: true },
        { start: 14, end: 105, highlight: false }
      ])
    })
  })
})
