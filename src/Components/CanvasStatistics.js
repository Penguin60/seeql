import "./CanvasStatistics.css";

function CanvasStatistics(props) {
    return (
        <div className="canvasStats">
            <p>Scale: {(props.scale * 100).toFixed(0)}%</p>
        </div>
    )
}

export default CanvasStatistics;