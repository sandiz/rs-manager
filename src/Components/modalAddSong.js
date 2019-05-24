
import React from 'react'
import PropTypes from 'prop-types';

const defaultState = {
    selectedSongs: [],
}
class AddSongModal extends React.Component {
    constructor(props) {
        super(props);
        this.state = { ...defaultState }
    }

    onHide = (e) => {
        this.setState({ ...defaultState });
        this.props.onClose();
    }

    addToSetlist() {
        console.log(this.props.exportSetlistKey, this.state.selectedSongs);
    }


    render() {
        return (
            <div style={{ display: this.props.show ? "block" : "none" }}>
                <div id="open-modal" className="modal-window" style={{ opacity: 1, pointerEvents: "auto" }}>
                    <div id="modal-info" style={{ width: 25 + '%' }}>
                        <a title="Close" className="modal-close" onClick={this.onHide}>Close</a>
                        <div style={{ textAlign: 'center' }}>
                            <h3>Add Songs:</h3>
                            <hr />
                            <div>
                                <div style={{
                                    marginBottom: 8 + 'px',
                                    marginLeft: 2 + 'px',
                                    marginTop: -8 + 'px',
                                }}>
                                    <span>Setlist: </span>
                                    <span className="font-weight-bold"> {unescape(this.props.exportSetlistName)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

AddSongModal.propTypes = {
    show: PropTypes.bool,
    exportSetlistKey: PropTypes.string,
    exportSetlistName: PropTypes.string,
    onClose: PropTypes.func,
}
AddSongModal.defaultProps = {
    show: false,
    exportSetlistKey: '',
    exportSetlistName: '',
    onClose: () => { },
}

export default AddSongModal;
