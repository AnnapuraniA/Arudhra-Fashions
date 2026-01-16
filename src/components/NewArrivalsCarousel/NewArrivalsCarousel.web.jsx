import { useState, useEffect, useRef } from 'react'
import { getImageUrl } from '../../utils/api'

function NewArrivalsCarouselWeb({ newArrivals, currentArrivalIndex, setCurrentArrivalIndex }) {
  // Auto-rotate carousel
  useEffect(() => {
    if (newArrivals.length <= 1) return

    const interval = setInterval(() => {
      setCurrentArrivalIndex((prev) => (prev + 1) % newArrivals.length)
    }, 4000)

    return () => clearInterval(interval)
  }, [newArrivals.length, setCurrentArrivalIndex])

  if (newArrivals.length === 0) {
    return null
  }

  // Calculate relative position from current index
  const total = newArrivals.length
  
  return (
    <section 
      className="new-arrivals-carousel-section"
    >
      <div className="container">
        <h2>New Arrivals</h2>
        <p className="new-arrivals-subtitle">Curated Collection Just For You</p>
        <div className="new-arrivals-carousel">
          {newArrivals.map((arrival, index) => {
            let relativeIndex = index - currentArrivalIndex
            
            // Handle wrapping for infinite rotation
            if (relativeIndex > total / 2) {
              relativeIndex -= total
            } else if (relativeIndex < -total / 2) {
              relativeIndex += total
            }
            
            // Determine position class
            let positionClass = 'hidden'
            if (relativeIndex === 0) {
              positionClass = 'center'
            } else if (relativeIndex === -2 || relativeIndex === total - 2) {
              positionClass = 'left-2'
            } else if (relativeIndex === -1 || relativeIndex === total - 1) {
              positionClass = 'left-1'
            } else if (relativeIndex === 1 || relativeIndex === -(total - 1)) {
              positionClass = 'right-1'
            } else if (relativeIndex === 2 || relativeIndex === -(total - 2)) {
              positionClass = 'right-2'
            }
            
            return (
              <div
                key={arrival.id}
                className={`arrival-slide ${positionClass}`}
              >
                <div className="arrival-slide-content">
                  <img 
                    src={getImageUrl(arrival.image)} 
                    alt={arrival.title}
                  />
                  <div className="arrival-slide-info">
                    <h3>{arrival.title}</h3>
                    {arrival.description && (
                      <p>{arrival.description}</p>
                    )}
                    <div className="arrival-slide-price">
                      <span className="current-price">₹{parseFloat(arrival.price).toLocaleString()}</span>
                      {arrival.originalPrice && parseFloat(arrival.originalPrice) > parseFloat(arrival.price) && (
                        <span className="original-price">₹{parseFloat(arrival.originalPrice).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default NewArrivalsCarouselWeb
